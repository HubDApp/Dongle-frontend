/** UTC-aware date utilities used by UI and persistence code. */

export type DateInput = Date | string | number;
export type NullableDateInput = DateInput | null | undefined;

export function nowUTC(): string {
  return new Date().toISOString();
}

export function toDate(date: NullableDateInput): Date | null {
  if (date === null || date === undefined) return null;
  const result = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function toUTCString(date: DateInput): string {
  const result = toDate(date);
  if (!result) throw new RangeError("Invalid date");
  return result.toISOString();
}

export function isValidDate(date: NullableDateInput): boolean {
  return toDate(date) !== null;
}

export function formatDate(
  dateInput: NullableDateInput,
  format: "short" | "long" | "relative" = "short",
): string {
  const date = toDate(dateInput);
  if (!date) return "N/A";

  if (format === "relative") return formatRelative(date);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: format === "long" ? "long" : "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateUTC(dateInput: NullableDateInput, format: "short" | "long" = "short"): string {
  return formatDate(dateInput, format);
}

export function formatDateISO(dateInput: NullableDateInput): string {
  const date = toDate(dateInput);
  return date ? date.toISOString().slice(0, 10) : "N/A";
}

export function formatRelative(dateInput: NullableDateInput): string {
  const date = toDate(dateInput);
  if (!date) return "N/A";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";

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

export function isWithinLastDays(dateInput: NullableDateInput, days: number): boolean {
  const date = toDate(dateInput);
  return date !== null && date.getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function newestFirst<T>(getDate: (item: T) => NullableDateInput): (a: T, b: T) => number {
  return (a, b) => (toDate(getDate(b))?.getTime() ?? 0) - (toDate(getDate(a))?.getTime() ?? 0);
}

export function oldestFirst<T>(getDate: (item: T) => NullableDateInput): (a: T, b: T) => number {
  return (a, b) => (toDate(getDate(a))?.getTime() ?? 0) - (toDate(getDate(b))?.getTime() ?? 0);
}