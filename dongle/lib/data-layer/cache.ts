/**
 * In-memory + optional persistent GET cache with TTL and stale windows.
 */

import { getDataLayerConfig } from "./config";
import { CACHE_STORAGE_KEY, readJson, removeKey, writeJson } from "./storage";
import type { CacheRecord } from "./types";

const memory = new Map<string, CacheRecord>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let hydrated = false;

function hydrateFromStorage(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  const stored = readJson<CacheRecord[]>(CACHE_STORAGE_KEY, []);
  const now = Date.now();
  for (const entry of stored) {
    if (!entry || typeof entry.key !== "string") continue;
    if (now > entry.expiresAt) continue;
    memory.set(entry.key, entry);
  }
}

function schedulePersist(): void {
  if (typeof window === "undefined") return;
  if (!getDataLayerConfig().persistCache) return;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const persistable = [...memory.values()].filter((entry) => entry.persist);
    writeJson(CACHE_STORAGE_KEY, persistable);
  }, 16);
}

export interface CacheLookup<T> {
  value: T;
  stale: boolean;
  expired: boolean;
  record: CacheRecord<T>;
}

export function cacheGet<T>(
  key: string,
  options: { allowStale?: boolean; allowExpired?: boolean } = {},
): CacheLookup<T> | undefined {
  hydrateFromStorage();
  const entry = memory.get(key) as CacheRecord<T> | undefined;
  if (!entry) return undefined;

  const now = Date.now();
  const expired = now > entry.expiresAt;
  const stale = now > entry.staleAt;

  if (expired) {
    if (!options.allowExpired) {
      memory.delete(key);
      schedulePersist();
      return undefined;
    }
    return { value: entry.value, stale: true, expired: true, record: entry };
  }

  if (stale && !options.allowStale) {
    return undefined;
  }

  return { value: entry.value, stale, expired, record: entry };
}

/**
 * Fresh lookup: returns undefined once the entry is stale or expired.
 * Use cacheGet(..., { allowStale: true }) to read stale data.
 */
export function cacheGetFresh<T>(key: string): T | undefined {
  const hit = cacheGet<T>(key, { allowStale: false, allowExpired: false });
  if (!hit || hit.stale || hit.expired) return undefined;
  return hit.value;
}

export function cacheSet<T>(
  key: string,
  value: T,
  options: {
    tags?: string[];
    persist?: boolean;
    ttlMs?: number;
    staleTtlMs?: number;
  } = {},
): void {
  hydrateFromStorage();
  const config = getDataLayerConfig();
  const ttl = options.ttlMs ?? config.cacheTtlMs;
  const staleExtra = options.staleTtlMs ?? config.staleTtlMs;
  const now = Date.now();
  const record: CacheRecord<T> = {
    key,
    value,
    cachedAt: now,
    staleAt: now + ttl,
    expiresAt: now + ttl + staleExtra,
    tags: options.tags ?? [],
    persist: Boolean(options.persist),
  };
  memory.set(key, record as CacheRecord);
  schedulePersist();
}

export function cacheDelete(key: string): boolean {
  hydrateFromStorage();
  const existed = memory.delete(key);
  if (existed) schedulePersist();
  return existed;
}

export function cacheDeleteByPrefix(prefix: string): string[] {
  hydrateFromStorage();
  const removed: string[] = [];
  for (const key of memory.keys()) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      memory.delete(key);
      removed.push(key);
    }
  }
  if (removed.length) schedulePersist();
  return removed;
}

export function cacheDeleteByTag(tag: string): string[] {
  hydrateFromStorage();
  const removed: string[] = [];
  for (const [key, entry] of memory) {
    if (entry.tags.includes(tag)) {
      memory.delete(key);
      removed.push(key);
    }
  }
  if (removed.length) schedulePersist();
  return removed;
}

export function cacheKeys(): string[] {
  hydrateFromStorage();
  return [...memory.keys()];
}

export function cacheClear(): void {
  memory.clear();
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  removeKey(CACHE_STORAGE_KEY);
}

export function evictExpiredCache(now = Date.now()): number {
  hydrateFromStorage();
  let count = 0;
  for (const [key, entry] of memory) {
    if (now > entry.expiresAt) {
      memory.delete(key);
      count += 1;
    }
  }
  if (count) schedulePersist();
  return count;
}

/** Remove entries that have passed their staleAt (time-based invalidation). */
export function evictStaleCache(now = Date.now()): string[] {
  hydrateFromStorage();
  const removed: string[] = [];
  for (const [key, entry] of memory) {
    if (now > entry.staleAt) {
      memory.delete(key);
      removed.push(key);
    }
  }
  if (removed.length) schedulePersist();
  return removed;
}

export function resetCacheForTests(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  memory.clear();
  hydrated = false;
  removeKey(CACHE_STORAGE_KEY);
}
