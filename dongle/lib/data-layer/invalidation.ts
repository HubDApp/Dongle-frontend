/**
 * Centralized cache invalidation.
 *
 * Supports key, prefix/group, tag, and global invalidation. Also drops
 * matching dedup window/in-flight entries and the project metadata caches
 * so invalidation cannot serve a just-invalidated in-flight result.
 */

import { clearAnalyticsCache } from "@/lib/analytics-dashboard/cache";
import { projectMetaCache, verificationStatusCache } from "@/lib/project-cache";
import {
  cacheClear,
  cacheDelete,
  cacheDeleteByPrefix,
  cacheDeleteByTag,
  evictStaleCache,
} from "./cache";
import { dedupeClear, dedupeDrop, dedupeDropByPrefix } from "./deduplication";

let globalGeneration = 0;
const keyGenerations = new Map<string, number>();
const listeners = new Set<(keys: string[]) => void>();

export function getCacheGeneration(key?: string): number {
  if (key) {
    return (keyGenerations.get(key) ?? 0) + globalGeneration;
  }
  return globalGeneration;
}

function bumpKey(key: string): void {
  keyGenerations.set(key, (keyGenerations.get(key) ?? 0) + 1);
}

function notify(keys: string[]): void {
  for (const listener of listeners) {
    try {
      listener(keys);
    } catch {
      /* isolate */
    }
  }
}

export function subscribeInvalidation(listener: (keys: string[]) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function invalidateKey(key: string): void {
  bumpKey(key);
  cacheDelete(key);
  dedupeDrop(key);
  notify([key]);
}

export function invalidateKeys(keys: string[]): void {
  const unique = [...new Set(keys)];
  for (const key of unique) {
    bumpKey(key);
    cacheDelete(key);
    dedupeDrop(key);
  }
  if (unique.length) notify(unique);
}

export function invalidatePrefix(prefix: string): void {
  const removed = cacheDeleteByPrefix(prefix);
  for (const key of removed) bumpKey(key);
  dedupeDropByPrefix(prefix);
  notify(removed.length ? removed : [prefix]);
}

export function invalidateTag(tag: string): void {
  const removed = cacheDeleteByTag(tag);
  for (const key of removed) {
    bumpKey(key);
    dedupeDrop(key);
  }

  if (tag === "projects" || tag === "project") {
    projectMetaCache.clear();
  }
  if (tag === "verification") {
    verificationStatusCache.clear();
  }
  if (tag === "analytics") {
    clearAnalyticsCache();
  }

  notify(removed.length ? removed : [tag]);
}

export function invalidateTags(tags: string[]): void {
  for (const tag of tags) {
    invalidateTag(tag);
  }
}

export function invalidateAll(): void {
  globalGeneration += 1;
  keyGenerations.clear();
  cacheClear();
  dedupeClear();
  projectMetaCache.clear();
  verificationStatusCache.clear();
  clearAnalyticsCache();
  notify(["*"]);
}

export function invalidateStale(): string[] {
  const removed = evictStaleCache();
  for (const key of removed) {
    bumpKey(key);
    dedupeDrop(key);
  }
  if (removed.length) notify(removed);
  return removed;
}

export function invalidateAfterMutation(input: {
  keys?: string[];
  tags?: string[];
  prefixes?: string[];
}): void {
  if (input.keys?.length) invalidateKeys(input.keys);
  if (input.prefixes?.length) {
    for (const prefix of input.prefixes) invalidatePrefix(prefix);
  }
  if (input.tags?.length) invalidateTags(input.tags);
}

export function resetInvalidationForTests(): void {
  globalGeneration = 0;
  keyGenerations.clear();
  listeners.clear();
}
