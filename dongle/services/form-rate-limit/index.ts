/**
 * Form rate limiting (Issue #554).
 */

export type {
  FormRateLimitConfig,
  RateLimitBucket,
  RateLimitDecision,
  RateLimitIdentity,
  RateLimitScope,
  RateLimitWindow,
} from "./types";

export { DEFAULT_RATE_LIMIT_CONFIG } from "./types";

export {
  createCustomConfig,
  createRateLimiter,
  formRateLimiter,
  formatDuration,
  resetRateLimitStore,
} from "./limiter";
