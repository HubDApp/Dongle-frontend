import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "@/lib/i18n";
import { formatDate, formatNumber, formatRelativeDate } from "@/lib/i18n/format";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("locale-aware formatting", () => {
  afterEach(() => setLocale("en"));

  it("formats numbers with locale grouping", () => {
    setLocale("en");
    expect(formatNumber(1000000)).toBe("1,000,000");
    setLocale("es");
    expect(formatNumber(1000000)).toBe("1.000.000");
    setLocale("pt");
    expect(formatNumber(1000000)).toBe("1.000.000");
  });

  it("orders date parts by locale", () => {
    const date = new Date(2024, 0, 15);
    setLocale("en");
    expect(formatDate(date, { style: "short" })).toMatch(/^1\/15\//);
    setLocale("es");
    expect(formatDate(date, { style: "short" })).toMatch(/^15\//);
    setLocale("pt");
    expect(formatDate(date, { style: "short" })).toMatch(/^15\//);
  });

  it("localizes relative dates", () => {
    const threeDaysAgo = Date.now() - 3 * DAY_MS - 1000;
    setLocale("en");
    expect(formatRelativeDate(threeDaysAgo)).toBe("3 days ago");
    setLocale("es");
    expect(formatRelativeDate(threeDaysAgo)).toBe("hace 3 días");
    setLocale("pt");
    expect(formatRelativeDate(threeDaysAgo)).toBe("há 3 dias");
  });
});
