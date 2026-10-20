/**
 * Redis-backed API rate limiting (Issue #729).
 */

export type {
  RateLimitCategory,
  RateLimitConfig,
  RateLimitIdentity,
  RateLimitQuota,
  RateLimitResult,
  RateLimitWindowState,
} from "./types";

export { RATE_LIMIT_HEADERS } from "./types";

export {
  AUTHENTICATED_MULTIPLIER,
  DEFAULT_RATE_LIMIT_CONFIG,
  RATE_LIMIT_WINDOW_SECONDS,
  classifyRequest,
} from "./config";

export {
  apiRateLimiter,
  createRateLimiter,
  resetRateLimitStore,
  type RateLimiterOptions,
} from "./limiter";

export { applyRateLimitHeaders, rateLimitResponse } from "./headers";
