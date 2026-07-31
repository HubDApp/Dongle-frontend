/**
 * Locale-aware formatting utilities
 * 
 * Provides consistent, locale-aware formatting for:
 * - Dates (absolute, relative, short formats)
 * - Numbers (decimals, percentages, currency)
 * - Lists and conjunctions
 */

import { getLocale } from "./index";

// ─── Date Formatting ────────────────────────────────────────────────────────

export type DateFormatStyle = "full" | "long" | "medium" | "short";

interface DateFormatOptions {
  style?: DateFormatStyle;
  includeTime?: boolean;
}

/**
 * Format a date according to the current locale
 * 
 * @example
 * formatDate(new Date()) // "January 15, 2024"
 * formatDate(new Date(), { style: "short" }) // "1/15/24"
 * formatDate(new Date(), { style: "long", includeTime: true }) // "January 15, 2024 at 3:30 PM"
 */
export function formatDate(
  date: Date | string | number,
  options: DateFormatOptions = {}
): string {
  const { style = "medium", includeTime = false } = options;
  const locale = getLocale();
  const dateObj = typeof date === "string" || typeof date === "number" 
    ? new Date(date) 
    : date;

  if (isNaN(dateObj.getTime())) {
    console.warn("Invalid date provided to formatDate:", date);
    return "Invalid date";
  }

  const dateStyle = style === "full" ? "long" : style;
  const timeStyle = includeTime ? "short" : undefined;

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle: dateStyle as "full" | "long" | "medium" | "short",
    timeStyle,
  };

  try {
    return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateObj.toISOString().split("T")[0];
  }
}

/**
 * Format a date relative to now (e.g., "2 days ago", "in 3 hours")
 * 
 * @example
 * formatRelativeDate(new Date(Date.now() - 86400000)) // "yesterday"
 * formatRelativeDate(new Date(Date.now() - 3600000)) // "1 hour ago"
 */
export function formatRelativeDate(
  date: Date | string | number
): string {
  const locale = getLocale();
  const dateObj = typeof date === "string" || typeof date === "number" 
    ? new Date(date) 
    : date;

  if (isNaN(dateObj.getTime())) {
    console.warn("Invalid date provided to formatRelativeDate:", date);
    return "Invalid date";
  }

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const isPast = diffMs < 0;

  // Determine the appropriate unit
  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "week", seconds: 604800 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
    { unit: "second", seconds: 1 },
  ];

  for (const { unit, seconds } of units) {
    if (diffSeconds >= seconds) {
      const value = Math.floor(diffSeconds / seconds);
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      return rtf.format(isPast ? -value : value, unit);
    }
  }

  return "just now";
}

/**
 * Format a date for display in a compact format
 * Shows relative time for recent dates, absolute for older dates
 * 
 * @example
 * formatSmartDate(new Date()) // "just now"
 * formatSmartDate(new Date(Date.now() - 86400000)) // "yesterday"
 * formatSmartDate(new Date("2023-01-01")) // "Jan 1, 2023"
 */
export function formatSmartDate(date: Date | string | number): string {
  const dateObj = typeof date === "string" || typeof date === "number" 
    ? new Date(date) 
    : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Use relative format for dates within the last 7 days
  if (diffDays >= 0 && diffDays < 7) {
    return formatRelativeDate(dateObj);
  }

  // Use absolute format for older dates
  return formatDate(dateObj, { style: "medium" });
}

// ─── Number Formatting ──────────────────────────────────────────────────────

interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  style?: "decimal" | "percent" | "currency";
  currency?: string;
}

/**
 * Format a number according to the current locale
 * 
 * @example
 * formatNumber(1234.56) // "1,234.56"
 * formatNumber(1234.567, { maximumFractionDigits: 2 }) // "1,234.57"
 * formatNumber(0.1234, { style: "percent" }) // "12.34%"
 */
export function formatNumber(
  value: number,
  options: NumberFormatOptions = {}
): string {
  const locale = getLocale();
  const { style = "decimal", ...restOptions } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style,
      ...restOptions,
    }).format(value);
  } catch (error) {
    console.error("Error formatting number:", error);
    return String(value);
  }
}

/**
 * Format a number as a percentage
 * 
 * @example
 * formatPercent(0.1234) // "12.34%"
 * formatPercent(0.5) // "50%"
 */
export function formatPercent(
  value: number,
  maximumFractionDigits = 2
): string {
  return formatNumber(value, {
    style: "percent",
    maximumFractionDigits,
  });
}

/**
 * Format a number with a fixed number of decimal places
 * Useful for displaying balances, ratings, etc.
 * 
 * @example
 * formatDecimal(3.14159, 2) // "3.14"
 * formatDecimal(100, 2) // "100.00"
 */
export function formatDecimal(
  value: number,
  decimalPlaces: number = 2
): string {
  return formatNumber(value, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
}

/**
 * Format a large number in compact form (e.g., 1.2k, 3.4M)
 * 
 * @example
 * formatCompactNumber(1234) // "1.2K"
 * formatCompactNumber(1234567) // "1.2M"
 */
export function formatCompactNumber(value: number): string {
  const locale = getLocale();

  try {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      compactDisplay: "short",
    }).format(value);
  } catch (error) {
    // Fallback for browsers that don't support notation: "compact"
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return String(value);
  }
}

// ─── List Formatting ────────────────────────────────────────────────────────

/**
 * Format a list of items with proper conjunctions
 * 
 * @example
 * formatList(["apple", "banana", "orange"]) // "apple, banana, and orange"
 * formatList(["apple", "banana"], "or") // "apple or banana"
 */
export function formatList(
  items: string[],
  type: "conjunction" | "disjunction" = "conjunction"
): string {
  const locale = getLocale();

  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  try {
    const listFormatter = new Intl.ListFormat(locale, {
      style: "long",
      type,
    });
    return listFormatter.format(items);
  } catch (error) {
    // Fallback for older browsers
    if (items.length === 2) {
      const connector = type === "conjunction" ? " and " : " or ";
      return items.join(connector);
    }
    const connector = type === "conjunction" ? ", and " : ", or ";
    return items.slice(0, -1).join(", ") + connector + items[items.length - 1];
  }
}
