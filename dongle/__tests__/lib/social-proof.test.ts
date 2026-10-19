import { describe, expect, it } from "vitest";
import { computeSocialProof } from "@/lib/social-proof";
import type { AnalyticsDataset } from "@/lib/analytics-dashboard/metrics";

const now = new Date("2026-10-19T12:00:00.000Z");

function project(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: id,
    primaryCategory: "DeFi / DEX" as const,
    description: "Project",
    rating: 4.5,
    reviews: 20,
    createdAt: "2026-10-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeSocialProof", () => {
  it("applies badge thresholds and priority, capped at two", () => {
    const dataset: AnalyticsDataset = {
      projects: [project("p1", { isFeatured: true, bookmarkCount: 51 })],
      reviews: [{ id: "r1", projectId: "p1", createdAt: "2026-10-19T10:00:00.000Z" }],
      verifications: [],
    };

    expect(computeSocialProof(dataset, now).p1.map((badge) => badge.type)).toEqual([
      "featured",
      "trending",
    ]);
  });

  it("ranks weekly activity per category and does not infer trends from lifetime totals", () => {
    const projects = Array.from({ length: 11 }, (_, index) => project(`p${index}`, { reviews: 500 - index }));
    const dataset: AnalyticsDataset = {
      projects,
      reviews: projects.slice(0, 10).map((item, index) => ({
        id: `r${index}`,
        projectId: item.id,
        createdAt: "2026-10-19T10:00:00.000Z",
      })),
      verifications: [],
    };

    const badges = computeSocialProof(dataset, now);
    expect(badges.p0.some((badge) => badge.type === "trending")).toBe(true);
    expect(badges.p10.some((badge) => badge.type === "trending")).toBe(false);
    expect(badges.p10.some((badge) => badge.type === "highly-rated")).toBe(true);
  });
});