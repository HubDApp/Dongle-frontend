/**
 * Coordinated data client.
 *
 * GET:  Request → Deduplication → Cache → Network (cache fallback when offline)
 * MUTATE: Online execution | Offline queue → Sync → Invalidation
 */

import { isNetworkError } from "@/lib/network-guard";
import { logger } from "@/lib/logger";
import { cacheGet, cacheGetFresh, cacheSet } from "./cache";
import { getDataLayerConfig } from "./config";
import { isOnline, startConnectivityMonitor, subscribeConnectivity } from "./connectivity";
import { dedupeRun } from "./deduplication";
import { getCacheGeneration, invalidateAfterMutation } from "./invalidation";
import {
  createIdempotencyKey,
  enqueueMutation,
  getPendingMutations,
  incrementAttempts,
  markCompleted,
  markFailed,
  markInFlight,
  recoverInFlightAsPending,
} from "./mutation-queue";
import { buildUrlWithParams, createRequestKey } from "./request-key";
import {
  getPendingMutationCount,
  getSyncUiStatus,
  setPendingMutationCount,
  setSyncUiStatus,
} from "./sync-status";
import type {
  GetJsonResult,
  MutateInput,
  MutateResult,
  QueuedMutation,
  RequestInput,
  SyncReport,
} from "./types";
import { OfflineCacheMissError } from "./types";

const SENSITIVE_PATH =
  /\/api\/auth(?:\/|$)|\/api\/notifications\/identify(?:\/|$)|\/api\/admin(?:\/|$)/i;

const mutationInflight = new Map<string, Promise<MutateResult<unknown>>>();
let autoSyncStop: (() => void) | null = null;

export function isSensitiveUrl(url: string): boolean {
  return SENSITIVE_PATH.test(url);
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const record = data as { error?: unknown; errors?: Array<{ message?: string }> };
    if (typeof record.error === "string" && record.error) return record.error;
    const first = record.errors?.[0]?.message;
    if (typeof first === "string" && first) return first;
  }
  return fallback;
}

function serializeBody(body: unknown): string | undefined {
  if (body === undefined) return undefined;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

function buildHeaders(
  headers: Record<string, string> | undefined,
  extras: Record<string, string>,
): Record<string, string> {
  return { ...headers, ...extras };
}

async function performFetch(input: {
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  idempotencyKey?: string;
}): Promise<{ response: Response; data: unknown }> {
  const extras: Record<string, string> = {};
  if (input.idempotencyKey) {
    extras["Idempotency-Key"] = input.idempotencyKey;
  }
  const serialized = serializeBody(input.body);
  if (serialized !== undefined && !input.headers?.["Content-Type"] && !input.headers?.["content-type"]) {
    extras["Content-Type"] = "application/json";
  }

  const headers = buildHeaders(input.headers, extras);
  const init: RequestInit = {
    method: input.method,
  };
  if (Object.keys(headers).length > 0) init.headers = headers;
  if (serialized !== undefined) init.body = serialized;
  if (input.credentials) init.credentials = input.credentials;

  const response = await fetch(input.url, init);
  const data = await response.json().catch(() => undefined);
  return { response, data };
}

function canPersist(input: RequestInput, url: string): boolean {
  if (!getDataLayerConfig().persistCache) return false;
  if (!input.persist) return false;
  if (isSensitiveUrl(url)) return false;
  if (input.credentials === "include") return false;
  return true;
}

function readCached<T>(
  key: string,
  options: { allowStale: boolean; allowExpired: boolean },
): GetJsonResult<T> | undefined {
  const hit = cacheGet<T>(key, options);
  if (!hit) return undefined;
  return {
    ok: true,
    status: 200,
    data: hit.value,
    fromCache: true,
    stale: hit.stale || hit.expired,
  };
}

/**
 * GET JSON with dedup + cache. HTTP errors do not throw (ok: false).
 * Network failures throw unless a cache fallback is available.
 */
export async function getJson<T>(input: RequestInput): Promise<GetJsonResult<T>> {
  const method = (input.method ?? "GET").toUpperCase();
  const url = buildUrlWithParams(input.url, input.params);
  const key = createRequestKey({ method, url, body: input.body });
  const useCache = input.cache !== false && method === "GET" && !isSensitiveUrl(url);
  const useDedupe = input.dedupe !== false && method === "GET";
  const online = isOnline();

  if (useCache) {
    if (online) {
      const fresh = cacheGetFresh<T>(key);
      if (fresh !== undefined) {
        return { ok: true, status: 200, data: fresh, fromCache: true, stale: false };
      }
    } else {
      const cached = readCached<T>(key, { allowStale: true, allowExpired: true });
      if (cached) return cached;
      throw new OfflineCacheMissError(url);
    }
  } else if (!online) {
    throw new OfflineCacheMissError(url);
  }

  const run = async (): Promise<GetJsonResult<T>> => {
    const generation = getCacheGeneration(key);
    try {
      const { response, data } = await performFetch({
        method,
        url,
        body: input.body,
        headers: input.headers,
        credentials: input.credentials,
      });

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          data: data as T | undefined,
          error: extractErrorMessage(data, response.statusText || "Request failed"),
          fromCache: false,
          stale: false,
        };
      }

      if (useCache && getCacheGeneration(key) === generation) {
        cacheSet(key, data as T, {
          tags: input.tags,
          persist: canPersist(input, url),
          ttlMs: input.cacheTtlMs,
          staleTtlMs: input.staleTtlMs,
        });
      }

      return {
        ok: true,
        status: response.status,
        data: data as T,
        fromCache: false,
        stale: false,
      };
    } catch (error) {
      const fallback = useCache
        ? readCached<T>(key, { allowStale: true, allowExpired: true })
        : undefined;
      if (fallback) {
        logger.debug("[data-layer] Serving stale cache after network error", url);
        return fallback;
      }
      throw error;
    }
  };

  if (!useDedupe) {
    return run();
  }

  return dedupeRun(key, run, input.dedupeWindowMs);
}

/**
 * GET that throws on HTTP or network errors (cache fallback still applies).
 */
export async function requestJson<T>(input: RequestInput): Promise<T> {
  const result = await getJson<T>(input);
  if (!result.ok || result.data === undefined) {
    throw new Error(result.error || "Request failed");
  }
  return result.data;
}

async function executeQueuedMutation(mutation: QueuedMutation): Promise<unknown> {
  const { response, data } = await performFetch({
    method: mutation.method,
    url: mutation.url,
    body: mutation.body,
    headers: mutation.headers,
    credentials: mutation.credentials,
    idempotencyKey: mutation.idempotencyKey,
  });

  if (!response.ok) {
    const error = new Error(
      extractErrorMessage(data, response.statusText || "Request failed"),
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return data;
}

async function executeWithRetry(mutation: QueuedMutation): Promise<unknown> {
  const config = getDataLayerConfig();
  let delay = config.syncInitialDelayMs;
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.syncMaxRetries; attempt++) {
    incrementAttempts(mutation.id);
    try {
      return await executeQueuedMutation(mutation);
    } catch (error) {
      lastError = error;
      const status = error && typeof error === "object" && "status" in error
        ? Number((error as { status: number }).status)
        : undefined;

      if (status !== undefined && status >= 400 && status < 500) {
        throw error;
      }

      const retryable = status === undefined || status >= 500 || isNetworkError(error);
      if (!retryable || attempt >= config.syncMaxRetries) {
        throw error;
      }

      await sleep(delay);
      delay = Math.min(delay * config.syncBackoffMultiplier, config.syncMaxDelayMs);
    }
  }

  throw lastError;
}

function applyInvalidation(input: {
  invalidateKeys?: string[];
  invalidateTags?: string[];
  invalidatePrefixes?: string[];
}): void {
  invalidateAfterMutation({
    keys: input.invalidateKeys,
    tags: input.invalidateTags,
    prefixes: input.invalidatePrefixes,
  });
}

export async function syncQueuedMutations(): Promise<SyncReport> {
  const report: SyncReport = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skippedDuplicate: 0,
    errors: [],
  };

  if (!isOnline()) {
    setSyncUiStatus("offline");
    setPendingMutationCount(getPendingMutations().length);
    return report;
  }

  recoverInFlightAsPending();
  const pending = getPendingMutations().filter((item) => item.status === "pending");
  setPendingMutationCount(pending.length);

  if (pending.length === 0) {
    const current = getSyncUiStatus();
    if (current === "reconnecting" || current === "syncing") {
      setSyncUiStatus("synced");
    }
    return report;
  }

  setSyncUiStatus("syncing");
  const seen = new Set<string>();

  for (const mutation of pending) {
    if (seen.has(mutation.idempotencyKey)) {
      markCompleted(mutation.id);
      report.skippedDuplicate += 1;
      continue;
    }
    seen.add(mutation.idempotencyKey);

    const inflight = markInFlight(mutation.id);
    if (!inflight || inflight.status === "completed") {
      report.skippedDuplicate += 1;
      continue;
    }

    report.attempted += 1;
    try {
      await executeWithRetry(inflight);
      markCompleted(mutation.id);
      applyInvalidation(mutation);
      report.succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      markFailed(mutation.id, message);
      report.failed += 1;
      report.errors.push({ id: mutation.id, error: message });
      logger.warn("[data-layer] Mutation sync failed", mutation.id, message);
    }

    setPendingMutationCount(getPendingMutations().filter((item) => item.status !== "completed").length);
  }

  if (report.failed > 0) {
    setSyncUiStatus("failed", report.errors[0]?.error ?? "Sync failed");
  } else {
    setSyncUiStatus("synced");
  }

  return report;
}

async function mutateOnce<T>(input: MutateInput, idempotencyKey: string): Promise<MutateResult<T>> {
  const queueWhenOffline = input.queueWhenOffline !== false;
  const online = isOnline();

  if (!online && queueWhenOffline) {
    const outcome = enqueueMutation({
      method: input.method,
      url: input.url,
      body: input.body,
      headers: input.headers,
      credentials: input.credentials,
      invalidateKeys: input.invalidateKeys,
      invalidateTags: input.invalidateTags,
      invalidatePrefixes: input.invalidatePrefixes,
      idempotencyKey,
      mutationType: input.mutationType,
    });
    setPendingMutationCount(getPendingMutations().length);
    setSyncUiStatus("offline");
    return {
      ok: true,
      queued: true,
      mutationId: outcome.mutation.id,
    };
  }

  if (!online && !queueWhenOffline) {
    return { ok: false, queued: false, error: "Cannot complete this action while offline" };
  }

  try {
    const { response, data } = await performFetch({
      method: input.method,
      url: input.url,
      body: input.body,
      headers: input.headers,
      credentials: input.credentials,
      idempotencyKey,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: data as T | undefined,
        error: extractErrorMessage(data, response.statusText || "Request failed"),
        queued: false,
      };
    }

    applyInvalidation(input);
    return {
      ok: true,
      status: response.status,
      data: data as T,
      queued: false,
    };
  } catch (error) {
    return {
      ok: false,
      queued: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function mutate<T>(input: MutateInput): Promise<MutateResult<T>> {
  const idempotencyKey =
    input.idempotencyKey ??
    createIdempotencyKey({
      method: input.method,
      url: input.url,
      body: input.body,
      mutationType: input.mutationType,
    });

  const existing = mutationInflight.get(idempotencyKey);
  if (existing) {
    return existing as Promise<MutateResult<T>>;
  }

  const pending = mutateOnce<T>(input, idempotencyKey);
  mutationInflight.set(idempotencyKey, pending as Promise<MutateResult<unknown>>);
  try {
    return await pending;
  } finally {
    mutationInflight.delete(idempotencyKey);
  }
}

export function startAutomaticSync(): () => void {
  if (autoSyncStop) return autoSyncStop;

  startConnectivityMonitor();
  if (!isOnline()) {
    setSyncUiStatus("offline");
    setPendingMutationCount(getPendingMutations().length);
  } else if (getPendingMutations().length > 0) {
    void syncQueuedMutations();
  }

  const unsubscribe = subscribeConnectivity((online) => {
    if (!online) {
      setSyncUiStatus("offline");
      setPendingMutationCount(getPendingMutations().length);
      return;
    }
    setSyncUiStatus("reconnecting");
    void syncQueuedMutations();
  });

  autoSyncStop = () => {
    unsubscribe();
    autoSyncStop = null;
  };
  return autoSyncStop;
}

export function getDataLayerSnapshot(): {
  online: boolean;
  pendingMutations: number;
  syncStatus: ReturnType<typeof getSyncUiStatus>;
} {
  return {
    online: isOnline(),
    pendingMutations: getPendingMutationCount(),
    syncStatus: getSyncUiStatus(),
  };
}

export function resetClientForTests(): void {
  mutationInflight.clear();
  autoSyncStop?.();
  autoSyncStop = null;
}
