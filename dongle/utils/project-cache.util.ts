/**
 * In-memory project metadata cache with a configurable TTL.
 *
 * - Keyed by project ID (string).
 * - Entries expire after TTL_MS (default: 60 seconds).
 * - Safe for both browser and Node/SSR environments.
 * - Module-singleton: the same Map instance is shared across all importers
 *   within one JS runtime / request lifecycle.
 */

import type { Project } from "@/types/project";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";
import { logger } from "@/lib/logger";

export const PROJECT_CACHE_TTL_MS = 60_000; // 1 minute

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function makeCache<T>() {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key: string, value: T, ttlMs: number = PROJECT_CACHE_TTL_MS): void {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },

    /** Return all non-expired entries as a plain record. */
    getAll(): Record<string, T> {
      const now = Date.now();
      const result: Record<string, T> = {};
      for (const [key, entry] of store) {
        if (now <= entry.expiresAt) {
          result[key] = entry.value;
        } else {
          store.delete(key);
        }
      }
      return result;
    },

    /**
     * Return the IDs from the provided list that are NOT in the cache
     * (or whose entries have expired).
     */
    getMissingKeys(ids: string[]): string[] {
      const now = Date.now();
      return ids.filter((id) => {
        const entry = store.get(id);
        if (!entry || now > entry.expiresAt) {
          if (entry) store.delete(id);
          return true;
        }
        return false;
      });
    },

    /** Bulk-set from a Record. */
    setMany(
      entries: Record<string, T>,
      ttlMs: number = PROJECT_CACHE_TTL_MS,
    ): void {
      const expiresAt = Date.now() + ttlMs;
      for (const [key, value] of Object.entries(entries)) {
        store.set(key, { value, expiresAt });
      }
    },

    delete(key: string): void {
      store.delete(key);
    },

    /** Remove all expired entries and return the count cleared. */
    evictExpired(): number {
      const now = Date.now();
      let count = 0;
      for (const [key, entry] of store) {
        if (now > entry.expiresAt) {
          store.delete(key);
          count++;
        }
      }
      if (count > 0) {
        logger.debug(`[ProjectCache] Evicted ${count} expired entries`);
      }
      return count;
    },

    /** Remove every entry (primarily for testing). */
    clear(): void {
      store.clear();
    },

    get size(): number {
      return store.size;
    },
  };
}

/** Cache for full project metadata, keyed by project ID. */
export const projectMetaCache = makeCache<Project>();

/** Cache for verification statuses, keyed by project ID. */
export const verificationStatusCache = makeCache<VerificationStatus>();
