/**
 * Redis-backed fixed-window rate limiter (Issue #729).
 *
 * Storage strategy mirrors lib/cache.ts: Redis-first with an in-process Map
 * fallback so the app keeps working when Redis is not configured. Redis uses an
 * atomic INCR + EXPIRE so multiple serverless instances share one quota.
 */

import { redis } from "@/lib/redis";
import {
  DEFAULT_RATE_LIMIT_CONFIG,
  RATE_LIMIT_WINDOW_SECONDS,
} from "./config";
import type {
  RateLimitCategory,
  RateLimitConfig,
  RateLimitIdentity,
  RateLimitResult,
  RateLimitWindowState,
} from "./types";

// ── In-process fallback store ────────────────────────────────────────────────

const fallback = new Map<string, RateLimitWindowState>();

function fallbackFetch(key: string, windowSeconds: number, now: number): RateLimitWindowState {
  const existing = fallback.get(key);
  if (!existing || existing.expiresAt <= now) {
    return { count: 0, expiresAt: now + windowSeconds * 1_000 };
  }
  return existing;
}

function fallbackIncrement(key: string, state: RateLimitWindowState): void {
  fallback.set(key, { ...state, count: state.count + 1 });
}

/** Test helper — wipe all fallback windows. */
export function resetRateLimitStore(): void {
  fallback.clear();
}

// ── Redis increment (atomic) ──────────────────────────────────────────────────

/**
 * Increment the counter for `key` and return the new count plus the epoch
 * second at which the window expires. Creates the window with a TTL on first
 * use.
 */
async function redisIncrement(
  key: string,
  windowSeconds: number,
): Promise<{ count: number; resetAt: number }> {
  const count = await redis!.incr(key);
  if (count === 1) {
    await redis!.expire(key, windowSeconds);
  }
  const ttl = await redis!.ttl(key);
  const effectiveTtl = ttl > 0 ? ttl : windowSeconds;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return { count, resetAt: nowSeconds + effectiveTtl };
}

// ── Core evaluator ────────────────────────────────────────────────────────────

function resolveQuota(config: RateLimitConfig, category: RateLimitCategory) {
  return config[category] ?? DEFAULT_RATE_LIMIT_CONFIG[category];
}

/**
 * Evaluate one window (either the anonymous IP bucket or the authenticated
 * subject bucket) without consuming anything.
 */
function buildResult(
  category: RateLimitCategory,
  quotaLimit: number,
  count: number,
  resetAt: number,
  authenticated: boolean,
  retryAfterSeconds: number,
): RateLimitResult {
  return {
    allowed: count <= quotaLimit,
    category,
    limit: quotaLimit,
    remaining: Math.max(0, quotaLimit - count),
    resetAt,
    retryAfterSeconds,
    authenticated,
  };
}

export interface RateLimiterOptions {
  config?: RateLimitConfig;
  /** Hash function applied to raw IPs before they are used as keys. */
  hashIp?: (ip: string) => string;
}

/**
 * Create a rate limiter bound to a config. Returns a `check` fn that records a
 * hit (fixed window) and reports the decision.
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const config = options.config ?? DEFAULT_RATE_LIMIT_CONFIG;
  const hashIp = options.hashIp ?? ((ip: string) => ip);

  async function check(
    identity: RateLimitIdentity,
    category: RateLimitCategory,
  ): Promise<RateLimitResult> {
    const quota = resolveQuota(config, category);
    const windowSeconds = quota.windowSeconds || RATE_LIMIT_WINDOW_SECONDS;

    // Authenticated callers use their own subject bucket with a higher limit;
    // anonymous callers fall back to the per-IP bucket.
    const authenticated = Boolean(identity.subject);
    const limit = authenticated
      ? Math.round(quota.limit * quota.authenticatedMultiplier)
      : quota.limit;

    const bucketValue = authenticated
      ? `sub:${identity.subject}`
      : `ip:${hashIp(identity.ip ?? "unknown")}`;
    const key = `ratelimit:${category}:${bucketValue}`;

    const now = Date.now();

    let count: number;
    let resetAt: number;

    if (redis) {
      try {
        const result = await redisIncrement(key, windowSeconds);
        count = result.count;
        resetAt = result.resetAt;
      } catch {
        // Redis error → fall back to in-process on this request.
        const state = fallbackFetch(key, windowSeconds, now);
        count = state.count;
        resetAt = Math.floor(state.expiresAt / 1_000);
        fallbackIncrement(key, state);
        count += 1;
      }
    } else {
      const state = fallbackFetch(key, windowSeconds, now);
      count = state.count;
      resetAt = Math.floor(state.expiresAt / 1_000);
      fallbackIncrement(key, state);
      count += 1;
    }

    const retryAfterSeconds = Math.max(0, resetAt - Math.floor(now / 1_000));
    const allowed = count <= limit;

    return buildResult(
      category,
      limit,
      // `count` includes the current request; expose remaining = limit - count.
      count,
      resetAt,
      authenticated,
      allowed ? 0 : retryAfterSeconds,
    );
  }

  function getConfig(): RateLimitConfig {
    return config;
  }

  return { check, getConfig };
}

/** Shared process-local limiter used by middleware and route handlers. */
export const apiRateLimiter = createRateLimiter();
