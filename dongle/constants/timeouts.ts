/**
 * Centralized timeout and duration constants.
 *
 * All timeout values used across the codebase should be defined here.
 */

// ─── Network / API ───────────────────────────────────────────────────────────

/** Timeout for the Soroban RPC server connection (ms). */
export const SOROBAN_SERVER_TIMEOUT_MS = 15_000;

/** Network health-check timeout (ms). */
export const NETWORK_CHECK_TIMEOUT_MS = 5_000;

// ─── UI Durations ────────────────────────────────────────────────────────────

/** Duration (ms) the auto-hide recovery banner stays visible. */
export const OFFLINE_BANNER_DURATION_MS = 3_000;

/** Duration (ms) the "Copied to clipboard" feedback is shown. */
export const CLIPBOARD_FEEDBACK_MS = 2_000;

/** Delay (ms) before redirecting after a successful form submission. */
export const POST_SUBMIT_REDIRECT_MS = 1_500;

// ─── Toast Durations ─────────────────────────────────────────────────────────

/** Duration (ms) a warning toast is displayed. */
export const TOAST_WARNING_DURATION_MS = 8_000;

/** Duration (ms) an error toast is displayed. */
export const TOAST_ERROR_DURATION_MS = 10_000;

// ─── Admin Auth ──────────────────────────────────────────────────────────────

/** Lifetime of an admin session token in seconds (15 minutes). */
export const ADMIN_TOKEN_MAX_AGE_SECONDS = 900;
