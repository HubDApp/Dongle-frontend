/**
 * In-memory project metadata cache with a configurable TTL.
 *
 * - Keyed by project ID (string).
 * - Entries expire after TTL_MS (default: 60 seconds).
 * - Safe for both browser and Node/SSR environments.
 * - Module-singleton: the same Map instance is shared across all importers
 *   within one JS runtime / request lifecycle.
 *
 * Server-side the backing Redis layer (lib/cache.ts) is used automatically
 * when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set, so all
 * Next.js instances share a single cache.  Reads/writes to this util
 * transparently warm/serve the Redis cache in addition to the local Map.
 */

import type { Project } from "@/types/project";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";
import { logger } from "@/lib/logger";
import {
  cacheGet,
  cacheSet,
  cacheDel,
  CacheKey,
  PROJECT_TTL_S,
  VERIFICATION_TTL_S,
} from "@/lib/cache";

export const PROJECT_CACHE_TTL_MS = 60_000; // 1 minute (in-process layer)

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function makeCache<T>(
  redisKeyFn?: (key: string) => string,
  redisTtlS?: number,
) {
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
      // Async Redis write — fire-and-forget, never blocks the caller
      if (redisKeyFn && redisTtlS && typeof window === "undefined") {
        cacheSet(redisKeyFn(key), value, redisTtlS).catch((err) =>
          logger.error("[ProjectCache] Redis write error:", err),
        );
      }
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
        if (redisKeyFn && redisTtlS && typeof window === "undefined") {
          cacheSet(redisKeyFn(key), value, redisTtlS).catch((err) =>
            logger.error("[ProjectCache] Redis bulk write error:", err),
          );
        }
      }
    },

    delete(key: string): void {
      store.delete(key);
      if (redisKeyFn && typeof window === "undefined") {
        cacheDel(redisKeyFn(key)).catch((err) =>
          logger.error("[ProjectCache] Redis delete error:", err),
        );
      }
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
export const projectMetaCache = makeCache<Project>(
  CacheKey.project,
  PROJECT_TTL_S,
);

/** Cache for verification statuses, keyed by project ID. */
export const verificationStatusCache = makeCache<VerificationStatus>(
  CacheKey.verification,
  VERIFICATION_TTL_S,
);

// ── Redis warm-up helper ──────────────────────────────────────────────────────

/**
 * Warm the in-process cache from Redis for a list of project IDs.
 * Call this at the start of a request for popular/pinned projects so
 * subsequent reads within the same request hit the local Map.
 *
 * Only runs server-side; safe to call client-side (no-op).
 */
export async function warmProjectCache(ids: string[]): Promise<void> {
  if (typeof window !== "undefined" || ids.length === 0) return;
  await Promise.allSettled(
    ids.map(async (id) => {
      if (projectMetaCache.get(id) !== undefined) return; // already warm
      const project = await cacheGet<Project>(CacheKey.project(id));
      if (project) {
        projectMetaCache.set(id, project, PROJECT_TTL_S * 1_000);
        logger.debug(`[ProjectCache] Warmed project ${id} from Redis`);
      }
    }),
  );
}
