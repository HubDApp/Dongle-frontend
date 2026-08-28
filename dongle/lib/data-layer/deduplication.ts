/**
 * Request deduplication: concurrent identical requests share one in-flight
 * promise; optional window reuses a settled successful result.
 */

import { getDataLayerConfig } from "./config";
import { recordDeduplicated, recordNetwork, recordRequest } from "./metrics";

interface WindowEntry<T> {
  promise: Promise<T>;
  expiresAt: number;
}

const inflight = new Map<string, Promise<unknown>>();
const windowed = new Map<string, WindowEntry<unknown>>();

function pruneWindow(now = Date.now()): void {
  for (const [key, entry] of windowed) {
    if (now > entry.expiresAt) {
      windowed.delete(key);
    }
  }
}

export async function dedupeRun<T>(
  key: string,
  execute: () => Promise<T>,
  windowMs?: number,
): Promise<T> {
  recordRequest();
  pruneWindow();

  const existingInflight = inflight.get(key);
  if (existingInflight) {
    recordDeduplicated();
    return existingInflight as Promise<T>;
  }

  const existingWindow = windowed.get(key);
  if (existingWindow && Date.now() <= existingWindow.expiresAt) {
    recordDeduplicated();
    return existingWindow.promise as Promise<T>;
  }

  recordNetwork();
  const pending = execute().then(
    (value) => {
      inflight.delete(key);
      const ttl = windowMs ?? getDataLayerConfig().dedupeWindowMs;
      if (ttl > 0) {
        windowed.set(key, { promise: Promise.resolve(value), expiresAt: Date.now() + ttl });
      }
      return value;
    },
    (error: unknown) => {
      inflight.delete(key);
      windowed.delete(key);
      throw error;
    },
  );

  inflight.set(key, pending);
  return pending;
}

export function dedupeHasInflight(key: string): boolean {
  return inflight.has(key);
}

export function dedupeDrop(key: string): void {
  inflight.delete(key);
  windowed.delete(key);
}

export function dedupeDropByPrefix(prefix: string): void {
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      inflight.delete(key);
    }
  }
  for (const key of [...windowed.keys()]) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      windowed.delete(key);
    }
  }
}

export function dedupeClear(): void {
  inflight.clear();
  windowed.clear();
}

export function resetDedupForTests(): void {
  dedupeClear();
}
