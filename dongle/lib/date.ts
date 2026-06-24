/**
 * Formats a date string, number, or Date object into short, long, or relative formats.
 * Falls back gracefully to "N/A" if the date is invalid.
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  format: "short" | "long" | "relative" = "short"
): string {
  if (dateInput === null || dateInput === undefined) return "N/A";

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (isNaN(date.getTime())) {
    return "N/A";
  }

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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Fall back to short if date is in the future
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
