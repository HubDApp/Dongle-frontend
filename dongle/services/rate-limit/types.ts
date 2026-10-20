/**
 * Redis-backed API rate limiting types (Issue #729).
 */

/** The quota category an endpoint falls under. */
export type RateLimitCategory = "read" | "write" | "search" | "admin";

/** A fixed-window quota. */
export interface RateLimitQuota {
  /** Maximum requests allowed inside the window (anonymous / per-IP). */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
  /**
   * Multiplier applied to `limit` for authenticated callers.
   * e.g. 3 → an authenticated request may make 3× the anonymous quota.
   */
  authenticatedMultiplier: number;
}

/** Per-category quota configuration. */
export type RateLimitConfig = Record<RateLimitCategory, RateLimitQuota>;

/** Identity used to bucket a request. */
export interface RateLimitIdentity {
  /** Resolved client IP (hashed before storage by the caller). */
  ip?: string | null;
  /** Authenticated subject (wallet address or user id) when present. */
  subject?: string | null;
}

/** Result of a rate-limit evaluation. */
export interface RateLimitResult {
  allowed: boolean;
  category: RateLimitCategory;
  /** The effective limit that applied (IP or authenticated). */
  limit: number;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Unix epoch (seconds) when the current window resets. */
  resetAt: number;
  /** Seconds until reset (for Retry-After). */
  retryAfterSeconds: number;
  /** True when the higher authenticated quota was applied. */
  authenticated: boolean;
}

/** Header names emitted on every response. */
export const RATE_LIMIT_HEADERS = {
  limit: "X-RateLimit-Limit",
  remaining: "X-RateLimit-Remaining",
  reset: "X-RateLimit-Reset",
  retryAfter: "Retry-After",
} as const;

/** Serialised window stored in Redis / fallback. */
export interface RateLimitWindowState {
  count: number;
  /** Epoch ms when this window expires. */
  expiresAt: number;
}
