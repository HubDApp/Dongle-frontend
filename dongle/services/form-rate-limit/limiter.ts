/**
 * In-memory sliding-window rate limiter for form submissions (Issue #554).
 */

import type {
  FormRateLimitConfig,
  RateLimitBucket,
  RateLimitDecision,
  RateLimitIdentity,
  RateLimitWindow,
} from "./types";
import { DEFAULT_RATE_LIMIT_CONFIG } from "./types";

const store = new Map<string, RateLimitBucket>();

function resolveConfig(
  base: FormRateLimitConfig,
  formId: string,
): { perIp: RateLimitWindow; perUser: RateLimitWindow } {
  const override = base.formOverrides?.[formId];
  return {
    perIp: { ...base.perIp, ...override?.perIp },
    perUser: { ...base.perUser, ...override?.perUser },
  };
}

function prune(bucket: RateLimitBucket, windowMs: number, now: number): number[] {
  const cutoff = now - windowMs;
  return bucket.timestamps.filter((ts) => ts > cutoff);
}

function evaluateWindow(
  key: string,
  window: RateLimitWindow,
  now: number,
  scopeLabel: string,
): RateLimitDecision {
  const bucket = store.get(key) ?? { timestamps: [] };
  const live = prune(bucket, window.windowMs, now);
  bucket.timestamps = live;
  store.set(key, bucket);

  const oldest = live[0];
  const resetAt =
    live.length === 0 ? now + window.windowMs : (oldest ?? now) + window.windowMs;
  const retryAfterSeconds = Math.max(0, Math.ceil((resetAt - now) / 1000));

  if (live.length >= window.limit) {
    return {
      allowed: false,
      scope: scopeLabel === "ip" ? "ip" : "user",
      limit: window.limit,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
      message:
        scopeLabel === "ip"
          ? `Too many submissions from this network. Try again in ${formatDuration(retryAfterSeconds)}.`
          : `You have reached the submission limit. Try again in ${formatDuration(retryAfterSeconds)}.`,
    };
  }

  return {
    allowed: true,
    scope: scopeLabel === "ip" ? "ip" : "user",
    limit: window.limit,
    remaining: Math.max(0, window.limit - live.length),
    resetAt,
    retryAfterSeconds: 0,
    message: "OK",
  };
}

export function formatDuration(seconds: number): string {
  if (seconds <= 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function createRateLimiter(config: FormRateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG) {
  return {
    /**
     * Check whether a submission is allowed without recording it.
     */
    check(identity: RateLimitIdentity, now = Date.now()): RateLimitDecision {
      const windows = resolveConfig(config, identity.formId);

      if (identity.ip) {
        const ipDecision = evaluateWindow(
          `ip:${identity.formId}:${identity.ip}`,
          windows.perIp,
          now,
          "ip",
        );
        if (!ipDecision.allowed) return ipDecision;
      }

      if (identity.userId) {
        const userDecision = evaluateWindow(
          `user:${identity.formId}:${identity.userId}`,
          windows.perUser,
          now,
          "user",
        );
        if (!userDecision.allowed) return userDecision;
        return userDecision;
      }

      if (identity.ip) {
        return evaluateWindow(
          `ip:${identity.formId}:${identity.ip}`,
          windows.perIp,
          now,
          "ip",
        );
      }

      return {
        allowed: true,
        limit: windows.perIp.limit,
        remaining: windows.perIp.limit,
        resetAt: now + windows.perIp.windowMs,
        retryAfterSeconds: 0,
        message: "OK",
      };
    },

    /**
     * Record a successful attempt if under the limit; otherwise return the block.
     */
    consume(identity: RateLimitIdentity, now = Date.now()): RateLimitDecision {
      const decision = this.check(identity, now);
      if (!decision.allowed) return decision;

      const windows = resolveConfig(config, identity.formId);
      const keys: Array<{ key: string; window: RateLimitWindow }> = [];

      if (identity.ip) {
        keys.push({
          key: `ip:${identity.formId}:${identity.ip}`,
          window: windows.perIp,
        });
      }
      if (identity.userId) {
        keys.push({
          key: `user:${identity.formId}:${identity.userId}`,
          window: windows.perUser,
        });
      }

      for (const entry of keys) {
        const bucket = store.get(entry.key) ?? { timestamps: [] };
        bucket.timestamps = prune(bucket, entry.window.windowMs, now);
        bucket.timestamps.push(now);
        store.set(entry.key, bucket);
      }

      // Remaining after this successful consume (never flip to blocked mid-success).
      return {
        ...decision,
        allowed: true,
        remaining: Math.max(0, decision.remaining - 1),
        message: "OK",
      };
    },

    /** Replace config at runtime (tests / admin). */
    getConfig(): FormRateLimitConfig {
      return config;
    },
  };
}

/** Shared process-local limiter used by the API route. */
export const formRateLimiter = createRateLimiter();

/** Test helper — wipe all buckets. */
export function resetRateLimitStore(): void {
  store.clear();
}

export function createCustomConfig(
  overrides: Partial<FormRateLimitConfig>,
): FormRateLimitConfig {
  return {
    perIp: { ...DEFAULT_RATE_LIMIT_CONFIG.perIp, ...overrides.perIp },
    perUser: { ...DEFAULT_RATE_LIMIT_CONFIG.perUser, ...overrides.perUser },
    formOverrides: {
      ...DEFAULT_RATE_LIMIT_CONFIG.formOverrides,
      ...overrides.formOverrides,
    },
  };
}
