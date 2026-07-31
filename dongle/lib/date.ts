/**
 * @module lib/date
 *
 * Consistent, timezone-safe date formatting utilities.
 *
 * Issue #255: Add consistent date formatting utility
 *
 * Design decisions:
 * - All formatters accept `string | number | Date | null | undefined` so
 *   callers never need to coerce before calling.
 * - Timezone-safe variants (`formatDateUTC`, `formatDateISO`) always operate
 *   in UTC to avoid the off-by-one-day problem caused by local timezone
 *   offsets when only a date portion (no time) is stored.
 * - Relative formatting (`formatDate` with `"relative"`, or `formatRelative`)
 *   works correctly for future dates and falls back gracefully.
 * - All functions return `"N/A"` for null / undefined / invalid inputs so
 *   UI components never need to handle undefined strings.
 */

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Coerce any accepted input type to a Date.
 * Returns null for invalid / missing values.
 */
function toDate(
  input: string | number | Date | null | undefined,
): Date | null {
  if (input === null || input === undefined) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

// ── Primary utility (backward-compatible) ──────────────────────────────────

/**
 * Formats a date string, number, or Date object into short, long, or
 * relative formats.  Falls back gracefully to `"N/A"` if the date is
 * invalid.
 *
 * @param dateInput - The value to format.
 * @param format    - `"short"` (numeric, default), `"long"` (named month),
 *                    or `"relative"` (human-readable distance from now).
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  format: "short" | "long" | "relative" = "short",
): string {
  const date = toDate(dateInput);
  if (!date) return "N/A";

  if (format === "short") {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }

  if (format === "long") {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (format === "relative") {
    return formatRelative(date);
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

