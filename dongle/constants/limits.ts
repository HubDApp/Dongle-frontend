/**
 * Centralized application limits and thresholds.
 *
 * Every magic-number limit used across the codebase should live here so that
 * tuning a value only requires a single change.
 */

// ─── Retry / Backoff ────────────────────────────────────────────────────────

/** Default number of retries for transient network requests. */
export const MAX_RETRIES = 3;

/** Initial backoff delay in milliseconds. */
export const INITIAL_BACKOFF_MS = 1_000;

/** Maximum backoff delay in milliseconds. */
export const MAX_BACKOFF_MS = 10_000;

/** Exponential backoff multiplier. */
export const BACKOFF_MULTIPLIER = 2;

// ─── Pagination / Display ────────────────────────────────────────────────────

/** Default page size for paginated lists. */
export const DEFAULT_PAGE_SIZE = 10;

/** Maximum visible page buttons in the pagination control. */
export const MAX_VISIBLE_PAGES = 5;

/** Number of top projects shown on the reviews page. */
export const TOP_PROJECTS_LIMIT = 6;

/** Number of topics shown on the repository metadata card. */
export const TOPICS_DISPLAY_LIMIT = 5;

/** Number of recent projects shown in the sidebar. */
export const RECENT_PROJECTS_LIMIT = 5;

/** Number of moderation log entries shown. */
export const MODERATION_LOG_LIMIT = 5;

/** Truncation length for transaction hashes. */
export const TX_HASH_DISPLAY_LENGTH = 8;

// ─── Transaction / Stellar ───────────────────────────────────────────────────

/** Default number of transactions fetched from Horizon. */
export const DEFAULT_TRANSACTION_LIMIT = 10;

/** Maximum comparison projects allowed in the compare view. */
export const MAX_COMPARISON_PROJECTS = 4;

// ─── Watchlist ───────────────────────────────────────────────────────────────

/** Maximum projects a user can add to their watchlist. */
export const MAX_WATCHLIST_SIZE = 20;

// ─── Saved searches ────────────────────────────────────────────────────────────

/** Maximum saved search filters per wallet. */
export const MAX_SAVED_SEARCHES = 10;

// ─── Review moderation / spam ────────────────────────────────────────────────

/** Reviews per wallet per day before velocity flagging and CAPTCHA. */
export const REVIEW_VELOCITY_DAILY_LIMIT = 10;

/** Minimum comment length before low-quality heuristic applies. */
export const REVIEW_SPAM_MIN_QUALITY_LENGTH = 20;
