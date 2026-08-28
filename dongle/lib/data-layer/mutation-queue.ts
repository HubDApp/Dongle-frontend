/**
 * Persistent offline mutation queue with idempotency protection.
 */

import { generateId } from "@/lib/id-generator";
import { getDataLayerConfig } from "./config";
import { QUEUE_STORAGE_KEY, readJson, removeKey, writeJson } from "./storage";
import type { QueuedMutation } from "./types";
import { stableStringify } from "./request-key";

const COMPLETED_RETENTION_MS = 60 * 60 * 1000;

let items: QueuedMutation[] | null = null;

function load(): QueuedMutation[] {
  if (items) return items;
  items = readJson<QueuedMutation[]>(QUEUE_STORAGE_KEY, []);
  if (!Array.isArray(items)) items = [];
  pruneCompleted(Date.now());
  return items;
}

function persist(): void {
  if (!getDataLayerConfig().persistQueue) return;
  writeJson(QUEUE_STORAGE_KEY, load());
}

function pruneCompleted(now: number): void {
  const list = items ?? [];
  items = list.filter((item) => {
    if (item.status !== "completed") return true;
    if (!item.completedAt) return false;
    return now - item.completedAt < COMPLETED_RETENTION_MS;
  });
}

export function createIdempotencyKey(input: {
  method: string;
  url: string;
  body?: unknown;
  mutationType?: string;
}): string {
  const type = input.mutationType ?? "";
  return `${type}|${input.method.toUpperCase()}|${input.url}|${stableStringify(input.body)}`;
}

export function getQueuedMutations(): QueuedMutation[] {
  return [...load()];
}

export function getPendingMutations(): QueuedMutation[] {
  return load().filter((item) => item.status === "pending" || item.status === "in_flight");
}

export function findByIdempotencyKey(idempotencyKey: string): QueuedMutation | undefined {
  return load().find((item) => item.idempotencyKey === idempotencyKey);
}

export interface EnqueueInput {
  method: QueuedMutation["method"];
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  invalidateKeys?: string[];
  invalidateTags?: string[];
  invalidatePrefixes?: string[];
  idempotencyKey?: string;
  mutationType?: string;
}

export type EnqueueOutcome =
  | { queued: true; mutation: QueuedMutation; duplicate: false }
  | { queued: true; mutation: QueuedMutation; duplicate: true };

/**
 * Enqueue a mutation. Identical pending/in-flight/recently-completed POSTs
 * are collapsed. PUT/PATCH with the same idempotency key replace the body.
 */
export function enqueueMutation(input: EnqueueInput): EnqueueOutcome {
  const list = load();
  const idempotencyKey =
    input.idempotencyKey ??
    createIdempotencyKey({
      method: input.method,
      url: input.url,
      body: input.body,
      mutationType: input.mutationType,
    });

  const existing = list.find((item) => item.idempotencyKey === idempotencyKey);
  if (existing) {
    if (existing.status === "in_flight") {
      return { queued: true, mutation: existing, duplicate: true };
    }
    if (existing.status === "completed") {
      return { queued: true, mutation: existing, duplicate: true };
    }
    if (existing.status === "pending" || existing.status === "failed") {
      if (input.method === "PUT" || input.method === "PATCH") {
        existing.body = input.body;
        existing.headers = input.headers;
        existing.status = "pending";
        existing.lastError = undefined;
        persist();
        return { queued: true, mutation: existing, duplicate: true };
      }
      if (existing.status === "pending") {
        return { queued: true, mutation: existing, duplicate: true };
      }
      existing.status = "pending";
      existing.lastError = undefined;
      persist();
      return { queued: true, mutation: existing, duplicate: false };
    }
  }

  const mutation: QueuedMutation = {
    id: generateId(),
    idempotencyKey,
    mutationType: input.mutationType,
    method: input.method,
    url: input.url,
    body: input.body,
    headers: input.headers,
    credentials: input.credentials,
    invalidateKeys: input.invalidateKeys,
    invalidateTags: input.invalidateTags,
    invalidatePrefixes: input.invalidatePrefixes,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
  };
  list.push(mutation);
  persist();
  return { queued: true, mutation, duplicate: false };
}

export function markInFlight(id: string): QueuedMutation | undefined {
  const mutation = load().find((item) => item.id === id);
  if (!mutation) return undefined;
  if (mutation.status === "completed") return mutation;
  mutation.status = "in_flight";
  persist();
  return mutation;
}

export function markCompleted(id: string): void {
  const mutation = load().find((item) => item.id === id);
  if (!mutation) return;
  mutation.status = "completed";
  mutation.completedAt = Date.now();
  mutation.lastError = undefined;
  persist();
}

export function markFailed(id: string, error: string): void {
  const mutation = load().find((item) => item.id === id);
  if (!mutation) return;
  mutation.status = "failed";
  mutation.lastError = error;
  persist();
}

export function incrementAttempts(id: string): number {
  const mutation = load().find((item) => item.id === id);
  if (!mutation) return 0;
  mutation.attempts += 1;
  persist();
  return mutation.attempts;
}

export function recoverInFlightAsPending(): void {
  const list = load();
  let changed = false;
  for (const item of list) {
    if (item.status === "in_flight") {
      item.status = "pending";
      changed = true;
    }
  }
  if (changed) persist();
}

export function resetMutationQueueForTests(): void {
  items = [];
  removeKey(QUEUE_STORAGE_KEY);
}
