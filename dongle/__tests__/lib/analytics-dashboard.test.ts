import { describe, it, expect, vi } from "vitest";
import {
  computeAnalytics,
  isCacheFresh,
  median,
  nextUtcMidnight,
  type AnalyticsDataset,
} from "@/lib/analytics-dashboard/metrics";
import { toCsv } from "@/lib/analytics-dashboard/csv";
import { PROJECT_CATEGORIES, type Project } from "@/types/project";

const now = new Date("2026-06-15T12:00:00.000Z");

function project(partial: Partial<Project> & { id: string; name: string }): Project {
  return {
    primaryCategory: PROJECT_CATEGORIES.DEFI,
    description: "d",
    rating: 4,
    reviews: 10,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

const dataset: AnalyticsDataset = {
  projects: [
    project({ id: "a", name: "Alpha", reviews: 70, rating: 4.8, createdAt: "2026-06-10T00:00:00.000Z" }),
    project({
      id: "b",
      name: "Beta",
      reviews: 14,
      rating: 4.1,
      primaryCategory: PROJECT_CATEGORIES.DAO,
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    project({
      id: "c",
      name: "Gamma",
      reviews: 4,
      rating: 3.2,
      primaryCategory: PROJECT_CATEGORIES.PAYMENTS,
      createdAt: "2026-06-14T00:00:00.000Z",
    }),
  ],
  reviews: [
    { id: "r1", projectId: "a", createdAt: "2026-06-12T00:00:00.000Z" },
    { id: "r2", projectId: "a", createdAt: "2026-06-13T00:00:00.000Z" },
    { id: "r2b", projectId: "a", createdAt: "2026-06-14T00:00:00.000Z" },
    { id: "r2c", projectId: "a", createdAt: "2026-06-14T12:00:00.000Z" },
    { id: "r2d", projectId: "a", createdAt: "2026-06-15T00:00:00.000Z" },
    { id: "r3", projectId: "b", createdAt: "2025-12-01T00:00:00.000Z" },
  ],
  verifications: [
    { projectId: "a", status: "VERIFIED", updatedAt: "2026-06-11T00:00:00.000Z" },
    { projectId: "b", status: "REJECTED", updatedAt: "2026-06-02T00:00:00.000Z" },
    { projectId: "c", status: "PENDING", updatedAt: "2026-06-14T00:00:00.000Z" },
  ],
};

describe("analytics metrics", () => {
  it("ranks trending by reviews in the window, not arbitrary order", () => {
    const result = computeAnalytics(dataset, {
      range: "7d",
      category: "all",
      verificationStatus: "all",
      now,
    });
    expect(result.trending[0].id).toBe("a");
    expect(result.trending[0].reviewsPerWeek).toBeGreaterThan(result.trending[1].reviewsPerWeek);
  });

  it("aggregates categories and weekly project counts", () => {
    const result = computeAnalytics(dataset, {
      range: "30d",
      category: "all",
      verificationStatus: "all",
      now,
    });
    expect(result.categories[0].count).toBeGreaterThanOrEqual(1);
    expect(result.summary.newProjectsPerWeek).toBeGreaterThan(0);
  });

  it("computes average rating, median reviews, and verification rate", () => {
    const result = computeAnalytics(dataset, {
      range: "all",
      category: "all",
      verificationStatus: "all",
      now,
    });
    expect(result.summary.averageRating).toBeCloseTo((4.8 + 4.1 + 3.2) / 3);
    expect(result.summary.medianReviewCount).toBe(14);
    expect(result.summary.verificationApprovalRate).toBe(0.5);
    expect(result.series.length).toBeGreaterThan(1);
  });

  it("applies date, category, and verification filters", () => {
    const defi = computeAnalytics(dataset, {
      range: "all",
      category: PROJECT_CATEGORIES.DEFI,
      verificationStatus: "all",
      now,
    });
    expect(defi.trending.every((row) => row.category === PROJECT_CATEGORIES.DEFI)).toBe(true);

    const verified = computeAnalytics(dataset, {
      range: "all",
      category: "all",
      verificationStatus: "VERIFIED",
      now,
    });
    expect(verified.trending.map((row) => row.id)).toEqual(["a"]);

    const week = computeAnalytics(dataset, {
      range: "7d",
      category: "all",
      verificationStatus: "all",
      now,
    });
    expect(week.trending.find((row) => row.id === "b")).toBeUndefined();
  });

  it("handles empty datasets", () => {
    const result = computeAnalytics(
      { projects: [], reviews: [], verifications: [] },
      { range: "all", category: "all", verificationStatus: "all", now },
    );
    expect(result.trending).toEqual([]);
    expect(result.summary.averageRating).toBeNull();
    expect(median([])).toBeNull();
  });

  it("treats cache as fresh until the next 00:00 UTC", () => {
    const generated = "2026-06-15T00:00:00.000Z";
    expect(isCacheFresh(generated, new Date("2026-06-15T23:59:00.000Z"))).toBe(true);
    expect(isCacheFresh(generated, new Date("2026-06-16T00:00:00.000Z"))).toBe(false);
    expect(nextUtcMidnight(new Date("2026-06-15T18:00:00.000Z")).toISOString()).toBe(
      "2026-06-16T00:00:00.000Z",
    );
  });

  it("exports CSV with headers, escaping, and UTF-8 BOM", () => {
    const csv = toCsv(
      ["name", "note"],
      [
        ["Alpha", 'He said "hello"'],
        ["Beta, Inc", "line\nbreak"],
      ],
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("name,note");
    expect(csv).toContain('"He said ""hello"""');
    expect(csv).toContain('"Beta, Inc"');
  });
});

describe("analytics soroban aggregation", () => {
  it("returns catalog data when Soroban RPC fails", async () => {
    const prevContract = process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT;
    const prevRpc = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
    process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT =
      "CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL = "https://rpc.example.test";
    const fetchMock = vi.fn(async () => new Response("nope", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const { loadAnalyticsDataset } = await import("@/lib/analytics-dashboard/soroban");
    const loaded = await loadAnalyticsDataset();
    expect(loaded.source).toBe("catalog");
    expect(loaded.rpcError).toMatch(/503/);
    expect(loaded.dataset.projects.length).toBeGreaterThan(0);
    process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT = prevContract;
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL = prevRpc;
    vi.unstubAllGlobals();
  });
});
