export * from "./limits";
export * from "./timeouts";

// Re-export for backwards compatibility - magic numbers consolidated
export { LIMITS } from "./limits";
export { TIMEOUTS } from "./timeouts";

// RETRY_POLICY consolidation (if not already in timeouts)
export const RETRY_POLICY = {
  MAX_RETRIES: 5,
  BACKOFF_MULTIPLIER: 2,
  INITIAL_DELAY_MS: 1000,
} as const;