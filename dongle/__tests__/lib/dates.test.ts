/**
 * Unit tests for date utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  nowUTC,
  toDate,
  toUTCString,
  isValidDate,
  formatDate,
  formatDateUTC,
  formatDateISO,
  formatRelative,
  isWithinLastDays,
  newestFirst,
  oldestFirst,
} from "@/lib/dates";

describe("Date Utilities", () => {
  beforeEach(() => {
    // Mock Date.now() to a fixed timestamp for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("nowUTC", () => {
    it("should return current time in ISO format", () => {
      const result = nowUTC();
      expect(result).toBe("2026-08-31T12:00:00.000Z");
    });

    it("should return a valid ISO string", () => {
      const result = nowUTC();
      expect(new Date(result).toISOString()).toBe(result);
    });
  });

  describe("toDate", () => {
    it("should convert ISO string to Date", () => {
      const dateStr = "2026-08-31T12:00:00Z";
      const result = toDate(dateStr);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2026-08-31T12:00:00.000Z");
    });

    it("should convert timestamp to Date", () => {
      const timestamp = 1725099600000;
      const result = toDate(timestamp);
      expect(result).toBeInstanceOf(Date);
    });

    it("should clone Date objects", () => {
      const date = new Date("2026-08-31T12:00:00Z");
      const result = toDate(date);
      expect(result).toBeInstanceOf(Date);
      expect(result).not.toBe(date);
      expect(result?.getTime()).toBe(date.getTime());
    });

    it("should return null for invalid dates", () => {
      expect(toDate("invalid")).toBeNull();
      expect(toDate(NaN)).toBeNull();
      expect(toDate(null)).toBeNull();
      expect(toDate(undefined)).toBeNull();
    });
  });

  describe("toUTCString", () => {
    it("should convert Date to ISO string", () => {
      const date = new Date("2026-08-31T12:00:00Z");
      const result = toUTCString(date);
      expect(result).toBe("2026-08-31T12:00:00.000Z");
    });

    it("should throw for invalid dates", () => {
      expect(() => toUTCString("invalid")).toThrow(RangeError);
      expect(() => toUTCString(NaN)).toThrow(RangeError);
    });
  });

  describe("isValidDate", () => {
    it("should return true for valid dates", () => {
      expect(isValidDate("2026-08-31T12:00:00Z")).toBe(true);
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(1725099600000)).toBe(true);
    });

    it("should return false for invalid dates", () => {
      expect(isValidDate("invalid")).toBe(false);
      expect(isValidDate(NaN)).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });

  describe("formatDate", () => {
    const testDate = "2026-08-31T00:00:00Z";

    it("should format date in short format by default", () => {
      const result = formatDate(testDate);
      expect(result).toBe("8/31/2026");
    });

    it("should format date in short format", () => {
      const result = formatDate(testDate, "short");
      expect(result).toBe("8/31/2026");
    });

    it("should format date in long format", () => {
      const result = formatDate(testDate, "long");
      expect(result).toBe("August 31, 2026");
    });

    it("should return N/A for invalid dates", () => {
      expect(formatDate(null)).toBe("N/A");
      expect(formatDate(undefined)).toBe("N/A");
      expect(formatDate("invalid")).toBe("N/A");
    });

    it("should format relative dates correctly", () => {
      // just now
      expect(formatDate(new Date(), "relative")).toBe("just now");

      // 5 minutes ago
      vi.setSystemTime(new Date("2026-08-31T12:05:00Z"));
      expect(formatDate("2026-08-31T12:00:00Z", "relative")).toBe("5 minutes ago");

      // 2 hours ago
      vi.setSystemTime(new Date("2026-08-31T14:00:00Z"));
      expect(formatDate("2026-08-31T12:00:00Z", "relative")).toBe("2 hours ago");

      // 3 days ago
      vi.setSystemTime(new Date("2026-09-03T12:00:00Z"));
      expect(formatDate("2026-08-31T12:00:00Z", "relative")).toBe("3 days ago");
    });
  });

  describe("formatDateUTC", () => {
    it("should format date in UTC", () => {
      const testDate = "2026-08-31T12:00:00Z";
      expect(formatDateUTC(testDate, "short")).toBe("8/31/2026");
      expect(formatDateUTC(testDate, "long")).toBe("August 31, 2026");
    });
  });

  describe("formatDateISO", () => {
    it("should format date as ISO date string", () => {
      const result = formatDateISO("2026-08-31T12:00:00Z");
      expect(result).toBe("2026-08-31");
    });

    it("should return N/A for invalid dates", () => {
      expect(formatDateISO(null)).toBe("N/A");
      expect(formatDateISO("invalid")).toBe("N/A");
    });
  });

  describe("formatRelative", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date("2026-08-31T12:00:00Z"));
    });

    it("should format dates relative to now", () => {
      const baseTime = new Date("2026-08-31T12:00:00Z");

      vi.setSystemTime(new Date("2026-08-31T12:00:05Z"));
      expect(formatRelative(baseTime)).toBe("just now");

      vi.setSystemTime(new Date("2026-08-31T12:05:00Z"));
      expect(formatRelative(baseTime)).toBe("5 minutes ago");

      vi.setSystemTime(new Date("2026-08-31T14:00:00Z"));
      expect(formatRelative(baseTime)).toBe("2 hours ago");

      vi.setSystemTime(new Date("2026-09-03T12:00:00Z"));
      expect(formatRelative(baseTime)).toBe("3 days ago");

      vi.setSystemTime(new Date("2026-11-31T12:00:00Z"));
      expect(formatRelative(baseTime)).toContain("month");

      vi.setSystemTime(new Date("2027-08-31T12:00:00Z"));
      expect(formatRelative(baseTime)).toBe("1 year ago");
    });

    it("should handle singular and plural forms", () => {
      const baseTime = new Date("2026-08-31T12:00:00Z");

      vi.setSystemTime(new Date("2026-08-31T13:00:00Z"));
      expect(formatRelative(baseTime)).toBe("1 hour ago");

      vi.setSystemTime(new Date("2026-09-01T12:00:00Z"));
      expect(formatRelative(baseTime)).toBe("1 day ago");
    });

    it("should return N/A for invalid dates", () => {
      expect(formatRelative(null)).toBe("N/A");
      expect(formatRelative("invalid")).toBe("N/A");
    });
  });

  describe("isWithinLastDays", () => {
    beforeEach(() => {
      vi.setSystemTime(new Date("2026-08-31T12:00:00Z"));
    });

    it("should return true for dates within range", () => {
      const recentDate = new Date("2026-08-29T12:00:00Z"); // 2 days ago
      expect(isWithinLastDays(recentDate, 7)).toBe(true);
      expect(isWithinLastDays(recentDate, 2)).toBe(true);
    });

    it("should return false for dates outside range", () => {
      const oldDate = new Date("2026-08-20T12:00:00Z"); // 11 days ago
      expect(isWithinLastDays(oldDate, 7)).toBe(false);
      expect(isWithinLastDays(oldDate, 10)).toBe(false);
    });

    it("should return false for invalid dates", () => {
      expect(isWithinLastDays(null, 7)).toBe(false);
      expect(isWithinLastDays("invalid", 7)).toBe(false);
    });
  });

  describe("newestFirst", () => {
    it("should sort items by date in descending order", () => {
      const items = [
        { name: "a", date: "2026-08-30T12:00:00Z" },
        { name: "b", date: "2026-08-31T12:00:00Z" },
        { name: "c", date: "2026-08-29T12:00:00Z" },
      ];

      const sorted = items.sort(newestFirst((item) => item.date));

      expect(sorted[0].name).toBe("b");
      expect(sorted[1].name).toBe("a");
      expect(sorted[2].name).toBe("c");
    });

    it("should handle null dates", () => {
      const items = [
        { name: "a", date: "2026-08-31T12:00:00Z" },
        { name: "b", date: null },
        { name: "c", date: "2026-08-30T12:00:00Z" },
      ];

      const sorted = items.sort(newestFirst((item) => item.date));
      expect(sorted[0].name).toBe("a");
    });
  });

  describe("oldestFirst", () => {
    it("should sort items by date in ascending order", () => {
      const items = [
        { name: "a", date: "2026-08-30T12:00:00Z" },
        { name: "b", date: "2026-08-31T12:00:00Z" },
        { name: "c", date: "2026-08-29T12:00:00Z" },
      ];

      const sorted = items.sort(oldestFirst((item) => item.date));

      expect(sorted[0].name).toBe("c");
      expect(sorted[1].name).toBe("a");
      expect(sorted[2].name).toBe("b");
    });
  });
});
