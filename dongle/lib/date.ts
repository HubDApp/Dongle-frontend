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
  format: "short" | "long" | "relative" = "short"
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
