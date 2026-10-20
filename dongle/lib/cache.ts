/**
 * Unified server-side cache layer.
 *
 * Strategy: Redis-first with in-process Map fallback.
 *
 * - When Redis is available, all reads/writes go through it so multiple
 *   Next.js instances (Vercel edge/serverless) share one cache.
 * - When Redis is unavailable (not configured, or a transient error) the
 *   module silently falls back to an in-process Map so the app never throws.
 *
 * Cache keys & TTLs (all match the issue spec):
 *   project:[id]           → 5 min  (PROJECT_TTL_S)
 *   reviews:[projectId]    → 2 min  (REVIEWS_TTL_S)
 *   verification:[id]      → 10 min (VERIFICATION_TTL_S)
 *   trending:7d            → 1 hr   (TRENDING_TTL_S)
 *
 * Hit-rate metrics are tracked per-key-prefix and exposed via getMetrics().
 */

import { redis } from "./redis";
import { logger } from "@/lib/logger";

// ── TTLs ──────────────────────────────────────────────────────────────────────
export const PROJECT_TTL_S = 5 * 60;        // 5 min
export const REVIEWS_TTL_S = 2 * 60;        // 2 min
export const VERIFICATION_TTL_S = 10 * 60;  // 10 min
export const TRENDING_TTL_S = 60 * 60;      // 1 hr

// ── Key helpers ───────────────────────────────────────────────────────────────
export const CacheKey = {
  project: (id: string) => `project:${id}`,
  reviews: (projectId: string) => `reviews:${projectId}`,
  verification: (projectId: string) => `verification:${projectId}`,
  trending7d: () => `trending:7d`,
} as const;

// ── In-process fallback store ─────────────────────────────────────────────────
interface FallbackEntry {
  value: string;
  expiresAt: number;
}

const fallback = new Map<string, FallbackEntry>();

function fallbackGet(key: string): string | null {
  const entry = fallback.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    fallback.delete(key);
    return null;
  }
  return entry.value;
}

function fallbackSet(key: string, value: string, ttlS: number): void {
  fallback.set(key, { value, expiresAt: Date.now() + ttlS * 1_000 });
}

function fallbackDelete(key: string): void {
  fallback.delete(key);
}

function fallbackDeletePattern(prefix: string): void {
  for (const k of fallback.keys()) {
    if (k.startsWith(prefix)) fallback.delete(k);
  }
}

// ── Hit-rate counters ─────────────────────────────────────────────────────────
export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
}

type MetricKey = "project" | "reviews" | "verification" | "trending";

const metrics: Record<MetricKey, { hits: number; misses: number; errors: number }> = {
  project:      { hits: 0, misses: 0, errors: 0 },
  reviews:      { hits: 0, misses: 0, errors: 0 },
  verification: { hits: 0, misses: 0, errors: 0 },
  trending:     { hits: 0, misses: 0, errors: 0 },
};

function metricKeyFor(cacheKey: string): MetricKey {
  if (cacheKey.startsWith("project:"))      return "project";
  if (cacheKey.startsWith("reviews:"))      return "reviews";
  if (cacheKey.startsWith("verification:")) return "verification";
  if (cacheKey.startsWith("trending:"))     return "trending";
  return "project"; // fallback bucket
}

/** Returns current hit-rate stats for all key prefixes. */
export function getMetrics(): Record<MetricKey, CacheMetrics> {
  const result = {} as Record<MetricKey, CacheMetrics>;
  for (const [k, v] of Object.entries(metrics) as [MetricKey, typeof metrics[MetricKey]][]) {
    const total = v.hits + v.misses;
    result[k] = { ...v, hitRate: total === 0 ? 0 : v.hits / total };
  }
  return result;
}

/** Reset all hit-rate counters (useful for testing). */
export function resetMetrics(): void {
  for (const v of Object.values(metrics)) {
    v.hits = 0;
    v.misses = 0;
    v.errors = 0;
  }
}

// ── Core get/set/del ──────────────────────────────────────────────────────────

/**
 * Get a cached value, deserialised from JSON.
 * Returns null on miss or error (graceful fallback).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const bucket = metricKeyFor(key);

  if (redis) {
    try {
      // @upstash/redis already parses JSON for us when the value is a string
      const raw = await redis.get<string>(key);
      if (raw === null || raw === undefined) {
        metrics[bucket].misses++;
        return null;
      }
      metrics[bucket].hits++;
      // Upstash may return already-parsed value; normalise to T
      return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
    } catch (err) {
      metrics[bucket].errors++;
      logger.error(`[Cache] Redis GET error for key "${key}":`, err);
      // fall through to in-process fallback
    }
  }

  // In-process fallback
  const raw = fallbackGet(key);
  if (raw === null) {
    metrics[bucket].misses++;
    return null;
  }
  metrics[bucket].hits++;
  return JSON.parse(raw) as T;
}

/**
 * Store a value, serialised to JSON, with an explicit TTL in seconds.
 * Silently swallows errors so writes never break the hot path.
 */
export async function cacheSet<T>(key: string, value: T, ttlS: number): Promise<void> {
  const serialised = JSON.stringify(value);

  if (redis) {
    try {
      await redis.set(key, serialised, { ex: ttlS });
    } catch (err) {
      logger.error(`[Cache] Redis SET error for key "${key}":`, err);
    }
    return; // don't double-write to fallback when Redis is up
  }

  fallbackSet(key, serialised, ttlS);
}

/**
 * Delete a specific key.
 */
export async function cacheDel(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      logger.error(`[Cache] Redis DEL error for key "${key}":`, err);
    }
    return;
  }
  fallbackDelete(key);
}

/**
 * Delete all keys matching a prefix (e.g. "reviews:" to bust all project reviews).
 *
 * With Redis this uses SCAN so it's non-blocking even for large keyspaces.
 * With the fallback store it does a simple prefix scan of the Map.
 */
export async function cacheDelPattern(prefix: string): Promise<void> {
  if (redis) {
    try {
      let cursor = 0;
      do {
        const [nextCursor, keys] = await redis.scan(cursor, {
          match: `${prefix}*`,
          count: 100,
        });
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== 0);
    } catch (err) {
      logger.error(`[Cache] Redis SCAN/DEL error for prefix "${prefix}":`, err);
    }
    return;
  }
  fallbackDeletePattern(prefix);
}
