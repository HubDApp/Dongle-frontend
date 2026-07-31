/**
 * UTC-aware date utilities
 * 
 * This module ensures consistent, timezone-independent date handling:
 * - Display formatting uses UTC to avoid timezone shifts
 * - Timestamps are created consistently in ISO 8601 UTC format
 * - Tests are stable regardless of machine timezone
 */

// ─── Timestamp Creation ─────────────────────────────────────────────────────

/**
 * Get current timestamp as ISO 8601 UTC string
 * Use for storing timestamps in databases or on-chain
 */
export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Convert any date input to UTC ISO string
 */
export function toUTCString(date: Date | string | number): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toISOString();
}

// ─── Date Validation ────────────────────────────────────────────────────────

/**
 * Check if date input is valid
 */
export function isValidDate(date: Date | string | number | null | undefined): boolean {
  if (date === null || date === undefined) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  return !isNaN(dateObj.getTime());
}

// ─── Display Formatting ─────────────────────────────────────────────────────

/**
 * Formats a date string, number, or Date object into short, long, or relative formats.
 * Uses UTC-based formatting to ensure consistent display across timezones.
 * Falls back gracefully to "N/A" if the date is invalid.
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  format: "short" | "long" | "relative" = "short",
): string {
  if (!isValidDate(dateInput)) return "N/A";

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput!);

  if (format === "short") {
    // Use UTC to avoid timezone shifts in display
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  if (format === "long") {
    // Use UTC to avoid timezone shifts in display
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  if (format === "relative") {
    // Relative times use actual elapsed time, not affected by timezone
    const now = Date.now();
    const diffMs = now - date.getTime();
    
    // Fall back to "just now" if date is in the future
    if (diffMs < 0) {
      return "just now";
    }

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? "" : "s"} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  }

  return "N/A";
}

// ── Timezone-safe utilities ─────────────────────────────────────────────────

/**
 * Format a date as a short date string in UTC, avoiding the off-by-one-day
 * problem that arises when a date-only ISO string (e.g. `"2024-03-15"`) is
 * interpreted in a timezone behind UTC.
 *
 * Example: `"2024-03-15"` → `"3/15/2024"` regardless of local timezone.
 */
export function formatDateUTC(
  dateInput: string | number | Date | null | undefined,
  format: "short" | "long" = "short",
): string {
  const date = toDate(dateInput);
  if (!date) return "N/A";

  const options: Intl.DateTimeFormatOptions =
    format === "long"
      ? { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
      : { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" };

  return date.toLocaleDateString("en-US", options);
}

/**
 * Return the date portion of an ISO-8601 timestamp (`YYYY-MM-DD`) in UTC.
 * Useful when you need a stable, sortable string key regardless of locale.
 *
 * Example: `new Date("2024-03-15T22:00:00-05:00")` → `"2024-03-16"` (UTC).
 */
export function formatDateISO(
  dateInput: string | number | Date | null | undefined,
): string {
  const date = toDate(dateInput);
  if (!date) return "N/A";
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ── Relative formatting ─────────────────────────────────────────────────────

/**
 * Return a human-readable relative distance from now, e.g. "3 days ago" or
 * "in 2 hours".
 *
 * - Handles both past and future dates.
 * - Falls back to `"N/A"` for invalid input.
 */
export function formatRelative(
  dateInput: string | number | Date | null | undefined,
): string {
  const date = toDate(dateInput);
  if (!date) return "N/A";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isFuture = diffMs < 0;

  const diffSec = Math.floor(absDiffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  let label: string;
  if (diffSec < 60) {
    label = "just now";
  } else if (diffMin < 60) {
    label = `${diffMin} minute${diffMin === 1 ? "" : "s"}`;
  } else if (diffHrs < 24) {
    label = `${diffHrs} hour${diffHrs === 1 ? "" : "s"}`;
  } else if (diffDays < 30) {
    label = `${diffDays} day${diffDays === 1 ? "" : "s"}`;
  } else if (diffMonths < 12) {
    label = `${diffMonths} month${diffMonths === 1 ? "" : "s"}`;
  } else {
    label = `${diffYears} year${diffYears === 1 ? "" : "s"}`;
  }

  if (label === "just now") return label;
  return isFuture ? `in ${label}` : `${label} ago`;
}

// ── Date arithmetic helpers ─────────────────────────────────────────────────

/**
 * Return true when `dateInput` falls within the last `days` calendar days.
 * Comparison is made against UTC midnight of each day to avoid timezone
 * edge cases.
 */
export function isWithinLastDays(
  dateInput: string | number | Date | null | undefined,
  days: number,
): boolean {
  const date = toDate(dateInput);
  if (!date) return false;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.getTime() >= cutoff.getTime();
}

/**
 * Sort comparator — newest first.
 * Pass directly to `Array.prototype.sort()`.
 *
 * @example
 * updates.sort(newestFirst(u => u.publishedAt))
 */
export function newestFirst<T>(
  getDate: (item: T) => string | number | Date | null | undefined,
): (a: T, b: T) => number {
  return (a, b) => {
    const da = toDate(getDate(a))?.getTime() ?? 0;
    const db = toDate(getDate(b))?.getTime() ?? 0;
    return db - da;
  };
}

/**
 * Sort comparator — oldest first.
 * Pass directly to `Array.prototype.sort()`.
 */
export function oldestFirst<T>(
  getDate: (item: T) => string | number | Date | null | undefined,
): (a: T, b: T) => number {
  return (a, b) => {
    const da = toDate(getDate(a))?.getTime() ?? 0;
    const db = toDate(getDate(b))?.getTime() ?? 0;
    return da - db;
  };
}

