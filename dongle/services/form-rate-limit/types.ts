/**
 * Form submission rate limiting types (Issue #554).
 */

export interface RateLimitWindow {
  /** Maximum allowed submissions inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface FormRateLimitConfig {
  /** Per-IP submission limits. */
  perIp: RateLimitWindow;
  /** Per-user / wallet submission limits. */
  perUser: RateLimitWindow;
  /** Optional per-form overrides keyed by formId. */
  formOverrides?: Record<
    string,
    Partial<{ perIp: RateLimitWindow; perUser: RateLimitWindow }>
  >;
}

export interface RateLimitIdentity {
  formId: string;
  /** Hashed or raw IP — hashed before storage when possible. */
  ip?: string | null;
  /** Authenticated user id or wallet address. */
  userId?: string | null;
}

export type RateLimitScope = "ip" | "user";

export interface RateLimitDecision {
  allowed: boolean;
  scope?: RateLimitScope;
  limit: number;
  remaining: number;
  /** Epoch ms when the active window resets. */
  resetAt: number;
  /** Seconds until reset (ceil). */
  retryAfterSeconds: number;
  /** Clear message suitable for UI / API clients. */
  message: string;
}

export interface RateLimitBucket {
  timestamps: number[];
}

export const DEFAULT_RATE_LIMIT_CONFIG: FormRateLimitConfig = {
  perIp: {
    limit: 20,
    windowMs: 60 * 60 * 1000, // 20 / hour
  },
  perUser: {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 10 / hour
  },
};
