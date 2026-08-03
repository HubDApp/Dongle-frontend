import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, nowUTC, toUTCString, isValidDate } from "@/lib/date";

describe("Date Formatting Utility", () => {
  beforeEach(() => {
    // Lock system time to a fixed timestamp for relative tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T19:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("UTC timestamp creation", () => {
    it("creates UTC ISO string", () => {
      const timestamp = nowUTC();
      expect(timestamp).toBe("2026-06-24T19:00:00.000Z");
      expect(timestamp.endsWith("Z")).toBe(true);
    });

    it("converts various inputs to UTC strings", () => {
      const date = new Date("2024-11-10T15:30:00Z");
      expect(toUTCString(date)).toBe("2024-11-10T15:30:00.000Z");
      expect(toUTCString("2024-11-10T15:30:00Z")).toBe("2024-11-10T15:30:00.000Z");
      expect(toUTCString(date.getTime())).toBe("2024-11-10T15:30:00.000Z");
    });
  });

  describe("date validation", () => {
    it("validates dates correctly", () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate("2024-11-10")).toBe(true);
      expect(isValidDate(1699630245123)).toBe(true);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate("invalid")).toBe(false);
      expect(isValidDate(new Date(NaN))).toBe(false);
    });
  });

  it("handles invalid dates gracefully", () => {
    expect(formatDate(null)).toBe("N/A");
    expect(formatDate(undefined)).toBe("N/A");
    expect(formatDate("invalid-date-string")).toBe("N/A");
    expect(formatDate(new Date(NaN))).toBe("N/A");
  });

  it("formats short date correctly and stably with UTC", () => {
    const testDate = new Date("2024-11-10T00:00:00Z");
    // Should display UTC date regardless of local timezone
    expect(formatDate(testDate, "short")).toBe("11/10/2024");
  });

  it("formats long date correctly and stably with UTC", () => {
    const testDate = new Date("2024-11-10T00:00:00Z");
    // Should display UTC date regardless of local timezone
    expect(formatDate(testDate, "long")).toBe("November 10, 2024");
  });

  describe("relative date formatting", () => {
    it("returns 'just now' for very recent dates", () => {
      const justNow = new Date("2026-06-24T18:59:45Z");
      expect(formatDate(justNow, "relative")).toBe("just now");
    });

    it("returns relative minutes", () => {
      const minutesAgo = new Date("2026-06-24T18:55:00Z");
      expect(formatDate(minutesAgo, "relative")).toBe("5 minutes ago");
    });

    it("returns relative hours", () => {
      const hoursAgo = new Date("2026-06-24T15:00:00Z");
      expect(formatDate(hoursAgo, "relative")).toBe("4 hours ago");
    });

    it("returns relative days", () => {
      const daysAgo = new Date("2026-06-20T19:00:00Z");
      expect(formatDate(daysAgo, "relative")).toBe("4 days ago");
    });

    it("returns relative months", () => {
      const monthsAgo = new Date("2026-04-20T19:00:00Z");
      expect(formatDate(monthsAgo, "relative")).toBe("2 months ago");
    });

    it("returns relative years", () => {
      const yearsAgo = new Date("2024-06-24T19:00:00Z");
      expect(formatDate(yearsAgo, "relative")).toBe("2 years ago");
    });

    it("handles future dates gracefully by returning 'just now'", () => {
      const futureDate = new Date("2026-06-24T20:00:00Z");
      expect(formatDate(futureDate, "relative")).toBe("just now");
    });

    it("is timezone-independent for relative calculations", () => {
      // Relative time uses elapsed milliseconds, unaffected by timezone display
      const hoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatDate(hoursAgo, "relative")).toBe("2 hours ago");
    });
  });
});
