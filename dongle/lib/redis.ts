/**
 * Redis client singleton (Upstash REST API).
 *
 * Supports both Upstash (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 * and a self-hosted Redis via the same Upstash-compatible REST interface.
 *
 * When env vars are absent the module exports `null` and all cache helpers
 * fall back to the in-memory layer — so the app still works in dev without
 * any Redis configuration.
 */

import { Redis } from "@upstash/redis";

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        "[Redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — using in-memory cache only",
      );
    }
    return null;
  }

  return new Redis({ url, token });
}

/** Upstash Redis client, or null when env vars are not configured. */
export const redis = createRedisClient();

/** Whether a real Redis connection is available. */
export const redisAvailable = redis !== null;
