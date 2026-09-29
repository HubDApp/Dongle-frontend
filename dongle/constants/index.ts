export * from "./limits";
export * from "./timeouts";

// RETRY_POLICY consolidation
export const RETRY_POLICY = {
  MAX_RETRIES: 5,
  BACKOFF_MULTIPLIER: 2,
  INITIAL_DELAY_MS: 1000,
} as const;