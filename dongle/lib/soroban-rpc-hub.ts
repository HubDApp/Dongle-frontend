/**
 * SorobanRpcHub — Deduplication + batching + caching layer for Soroban RPC.
 *
 * Acceptance criteria covered:
 *  ✓ Query deduplication  — same key within DEDUP_WINDOW_MS reuses in-flight Promise
 *  ✓ Request batching     — delegates to soroban-batch (50 ms debounce, 100-req chunks)
 *  ✓ Query caching w/ TTL — per-key TTL, default DEFAULT_TTL_MS
 *  ✓ Prefetching          — prefetch(key, fetcher) warms the cache proactively
 *  ✓ Cancel on unmount    — every call accepts an AbortSignal; AbortError skipped silently
 *  ✓ Performance metrics  — hits/misses/dedup-saves/errors/latency via getMetrics()
 */

import { rpc, xdr } from "stellar-sdk";
import { batchGetContractData } from "./soroban-batch";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Window in ms during which an identical in-flight query is deduplicated. */
const DEDUP_WINDOW_MS = 1_000;

/** Default TTL for cached results. */
export const DEFAULT_TTL_MS = 30_000; // 30 s

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SorobanQueryOptions {
  /** Override the per-entry TTL (ms). */
  ttlMs?: number;
  /** AbortSignal — if aborted the query is cancelled and the Promise rejects. */
  signal?: AbortSignal;
  /** When true the result is never served from cache. */
  bypassCache?: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface InFlightEntry<T> {
  promise: Promise<T>;
  startedAt: number;
}

export interface RpcMetrics {
  hits: number;
  misses: number;
  /** Calls saved by deduplication (extra callers that reused an in-flight request). */
  dedupSaves: number;
  errors: number;
  /** Average latency in ms for cache-miss fetches. */
  avgLatencyMs: number;
  totalRequests: number;
}

// ── Internal state ─────────────────────────────────────────────────────────────

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, InFlightEntry<unknown>>();

const _metrics = {
  hits: 0,
  misses: 0,
  dedupSaves: 0,
  errors: 0,
  totalLatencyMs: 0,
  completedFetches: 0,
  totalRequests: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function isDeduplicatable(key: string): boolean {
  const entry = inFlight.get(key);
  if (!entry) return false;
  // Only reuse if the in-flight request started within the dedup window
  return Date.now() - entry.startedAt < DEDUP_WINDOW_MS;
}

// ── Core query ────────────────────────────────────────────────────────────────

/**
 * Generic deduplicated + cached query against the Soroban RPC hub.
 *
 * @param key      Stable cache key (e.g. `"contractData:<contractId>:<keyHex>"`)
 * @param fetcher  Async function that performs the actual RPC call
 * @param options  TTL, AbortSignal, bypassCache
 */
export async function query<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: SorobanQueryOptions = {},
): Promise<T> {
  const { ttlMs = DEFAULT_TTL_MS, signal, bypassCache = false } = options;

  _metrics.totalRequests++;

  // 1. Serve from cache
  if (!bypassCache) {
    const cached = cacheGet<T>(key);
    if (cached !== undefined) {
      _metrics.hits++;
      return cached;
    }
  }

  _metrics.misses++;

  // 2. Deduplicate in-flight requests
  if (isDeduplicatable(key)) {
    _metrics.dedupSaves++;
    return (inFlight.get(key) as InFlightEntry<T>).promise;
  }

  // 3. Fire the real fetch
  const startMs = Date.now();

  const promise = (async (): Promise<T> => {
    try {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const result = await fetcher();

      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      cacheSet(key, result, ttlMs);

      const latency = Date.now() - startMs;
      _metrics.totalLatencyMs += latency;
      _metrics.completedFetches++;

      return result;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      _metrics.errors++;
      throw err;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, { promise: promise as Promise<unknown>, startedAt: startMs });

  return promise;
}

// ── Contract-data specialisation ──────────────────────────────────────────────

/**
 * Deduplicated + batched + cached `getContractData` call.
 *
 * Delegates to the existing batching layer in `soroban-batch.ts`.
 */
export async function queryContractData(
  contractId: string,
  key: xdr.ScVal,
  options: SorobanQueryOptions = {},
): Promise<rpc.Api.LedgerEntryResult | null> {
  const keyHex = key.toXDR("hex");
  const cacheKey = `contractData:${contractId}:${keyHex}`;

  return query(
    cacheKey,
    () => batchGetContractData(contractId, key),
    options,
  );
}

// ── Prefetch ──────────────────────────────────────────────────────────────────

/**
 * Proactively warm the cache for a predictable query.
 * Errors are swallowed — prefetch is best-effort.
 */
export function prefetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: Omit<SorobanQueryOptions, "signal"> = {},
): void {
  // Skip if already cached or in-flight
  if (cacheGet(key) !== undefined || isDeduplicatable(key)) return;

  query(key, fetcher, options).catch(() => {
    // intentionally ignored
  });
}

/**
 * Prefetch a `getContractData` entry.
 */
export function prefetchContractData(
  contractId: string,
  key: xdr.ScVal,
  options: Omit<SorobanQueryOptions, "signal"> = {},
): void {
  const cacheKey = `contractData:${contractId}:${key.toXDR("hex")}`;
  prefetch(cacheKey, () => batchGetContractData(contractId, key), options);
}

// ── Cache management ──────────────────────────────────────────────────────────

/** Manually invalidate a specific cache entry. */
export function invalidate(key: string): void {
  cache.delete(key);
}

/** Invalidate all entries whose key starts with `prefix`. */
export function invalidateByPrefix(prefix: string): void {
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

/** Remove all expired entries (useful for long-lived processes). */
export function pruneExpired(): void {
  const now = Date.now();
  for (const [k, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(k);
  }
}

// ── Metrics ───────────────────────────────────────────────────────────────────

/** Return a snapshot of current performance metrics. */
export function getMetrics(): RpcMetrics {
  return {
    hits: _metrics.hits,
    misses: _metrics.misses,
    dedupSaves: _metrics.dedupSaves,
    errors: _metrics.errors,
    totalRequests: _metrics.totalRequests,
    avgLatencyMs:
      _metrics.completedFetches === 0
        ? 0
        : Math.round(_metrics.totalLatencyMs / _metrics.completedFetches),
  };
}

/** Reset all metrics counters (useful in tests). */
export function resetMetrics(): void {
  Object.assign(_metrics, {
    hits: 0,
    misses: 0,
    dedupSaves: 0,
    errors: 0,
    totalLatencyMs: 0,
    completedFetches: 0,
    totalRequests: 0,
  });
}
