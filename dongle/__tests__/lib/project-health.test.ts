import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  HEALTH_WEIGHTS,
  computeHealthScore,
  gradeFor,
  scoreGithubActivity,
  scoreOnChainVolume,
  scoreReviewSentiment,
  scoreUpdateRecency,
  scoreVerification,
  type HealthInput,
} from "@/lib/project-health/score";
import {
  HEALTH_SNAPSHOT_STORAGE_KEY,
  MAX_SNAPSHOTS_PER_PROJECT,
  getHealthHistory,
  getHealthTrend,
  recordHealthSnapshot,
  recordHealthSnapshots,
  weekStart,
} from "@/lib/project-health/history";

const NOW = new Date("2026-10-19T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const base: HealthInput = {
  createdAt: daysAgo(0),
  rating: 0,
  reviewCount: 0,
  now: NOW,
};

describe("health weights", () => {
  it("match the spec and sum to 100%", () => {
    expect(HEALTH_WEIGHTS).toEqual({
      updateRecency: 0.25,
      reviewSentiment: 0.25,
      verification: 0.2,
      githubActivity: 0.15,
      onChainVolume: 0.15,
    });
    const sum = Object.values(HEALTH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });
});

describe("factor scorers", () => {
  it("update recency halves every 90 days and falls back to createdAt", () => {
    expect(scoreUpdateRecency({ ...base, lastUpdateAt: daysAgo(0) }, NOW).score).toBeCloseTo(100);
    expect(scoreUpdateRecency({ ...base, lastUpdateAt: daysAgo(90) }, NOW).score).toBeCloseTo(50);
    const fallback = scoreUpdateRecency({ ...base, createdAt: daysAgo(180) }, NOW);
    expect(fallback.score).toBeCloseTo(25);
    expect(fallback.detail).toBe("Listed 180 days ago");
  });

  it("update recency is unavailable for invalid dates", () => {
    expect(scoreUpdateRecency({ ...base, createdAt: "not-a-date" }, NOW).score).toBeNull();
  });

  it("review sentiment pulls sparse ratings toward neutral", () => {
    expect(scoreReviewSentiment({ ...base, rating: 0, reviewCount: 0 }).score).toBeCloseTo(50);
    expect(scoreReviewSentiment({ ...base, rating: 5, reviewCount: 1 }).score).toBeCloseTo(58.33, 1);
    expect(scoreReviewSentiment({ ...base, rating: 5, reviewCount: 5 }).score).toBeCloseTo(75);
    expect(scoreReviewSentiment({ ...base, rating: 1, reviewCount: 1_000_000 }).score).toBeCloseTo(0, 0);
  });

  it("verification maps status and tier", () => {
    expect(scoreVerification({ ...base, verificationStatus: "VERIFIED", verificationTier: "GOLD" }).score).toBe(100);
    expect(scoreVerification({ ...base, verificationStatus: "VERIFIED", verificationTier: "BRONZE" }).score).toBe(90);
    expect(scoreVerification({ ...base, verificationStatus: "VERIFIED" }).score).toBe(85);
    expect(scoreVerification({ ...base, verificationStatus: "PENDING" }).score).toBe(50);
    expect(scoreVerification({ ...base, verificationStatus: "NONE" }).score).toBe(25);
    expect(scoreVerification({ ...base }).score).toBe(25);
    expect(scoreVerification({ ...base, verificationStatus: "REJECTED" }).score).toBe(0);
  });

  it("github activity is unavailable without a repository or repository data", () => {
    expect(scoreGithubActivity({ ...base, repository: null }, NOW).score).toBeNull();
    expect(scoreGithubActivity({ ...base, repository: {} }, NOW).score).toBeNull();
  });

  it("github activity blends push recency and popularity", () => {
    const full = scoreGithubActivity({ ...base, repository: { lastUpdate: daysAgo(0), stars: 1000 } }, NOW);
    expect(full.score).toBeCloseTo(100);
    const mixed = scoreGithubActivity({ ...base, repository: { lastUpdate: daysAgo(60), stars: 10 } }, NOW);
    expect(mixed.score).toBeCloseTo(45.41, 1);
  });

  it("on-chain volume is log-scaled and unavailable without contracts", () => {
    expect(scoreOnChainVolume({ ...base, txCount30d: null }).score).toBeNull();
    expect(scoreOnChainVolume({ ...base }).score).toBeNull();
    expect(scoreOnChainVolume({ ...base, txCount30d: 0 }).score).toBe(0);
    expect(scoreOnChainVolume({ ...base, txCount30d: 1000 }).score).toBeCloseTo(100);
    expect(scoreOnChainVolume({ ...base, txCount30d: 50_000 }).score).toBe(100);
  });
});

describe("computeHealthScore", () => {
  it("scores a fully healthy project at 100", () => {
    const health = computeHealthScore({
      ...base,
      lastUpdateAt: daysAgo(0),
      rating: 5,
      reviewCount: 10_000_000,
      verificationStatus: "VERIFIED",
      verificationTier: "GOLD",
      repository: { lastUpdate: daysAgo(0), stars: 1000 },
      txCount30d: 1000,
    });
    expect(health.score).toBe(100);
    expect(health.grade).toBe("excellent");
    expect(health.redistributed).toBe(false);
    expect(health.factors.map((f) => f.effectiveWeight)).toEqual([0.25, 0.25, 0.2, 0.15, 0.15]);
  });

  it("redistributes weight from unavailable factors", () => {
    const health = computeHealthScore({ ...base, lastUpdateAt: daysAgo(0) });
    // (100×.25 + 50×.25 + 25×.20) / .70 = 60.7
    expect(health.score).toBe(61);
    expect(health.grade).toBe("good");
    expect(health.redistributed).toBe(true);

    const github = health.factors.find((f) => f.key === "githubActivity")!;
    expect(github.available).toBe(false);
    expect(github.score).toBeNull();
    expect(github.effectiveWeight).toBe(0);

    const total = health.factors.reduce((s, f) => s + f.effectiveWeight, 0);
    expect(total).toBeCloseTo(1);
  });

  it("always stays within 0–100", () => {
    const worst = computeHealthScore({
      ...base,
      createdAt: daysAgo(5000),
      rating: 1,
      reviewCount: 1_000_000,
      verificationStatus: "REJECTED",
      repository: { lastUpdate: daysAgo(5000), stars: 0 },
      txCount30d: 0,
    });
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThan(5);
    expect(worst.grade).toBe("poor");
  });

  it("grades at the documented thresholds", () => {
    expect(gradeFor(80)).toBe("excellent");
    expect(gradeFor(79)).toBe("good");
    expect(gradeFor(60)).toBe("good");
    expect(gradeFor(59)).toBe("fair");
    expect(gradeFor(40)).toBe("fair");
    expect(gradeFor(39)).toBe("poor");
  });
});

describe("weekly snapshots", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("computes the Monday (UTC) of the week", () => {
    expect(weekStart(new Date("2026-10-19T00:00:00Z"))).toBe("2026-10-19");
    expect(weekStart(new Date("2026-10-25T23:59:00Z"))).toBe("2026-10-19");
    expect(weekStart(new Date("2026-10-26T00:00:00Z"))).toBe("2026-10-26");
    expect(weekStart(new Date("2026-01-01T10:00:00Z"))).toBe("2025-12-29");
  });

  it("keeps one snapshot per week, overwriting within the week", () => {
    recordHealthSnapshot("p1", 50, new Date("2026-10-19T10:00:00Z"));
    recordHealthSnapshot("p1", 55, new Date("2026-10-22T10:00:00Z"));
    expect(getHealthHistory("p1")).toEqual([{ week: "2026-10-19", score: 55 }]);

    recordHealthSnapshot("p1", 70, new Date("2026-10-27T10:00:00Z"));
    expect(getHealthHistory("p1")).toEqual([
      { week: "2026-10-19", score: 55 },
      { week: "2026-10-26", score: 70 },
    ]);
    expect(getHealthTrend(getHealthHistory("p1"))).toBe(15);
  });

  it("records many projects at once and caps history length", () => {
    const start = new Date("2025-01-06T00:00:00Z");
    for (let i = 0; i < MAX_SNAPSHOTS_PER_PROJECT + 5; i++) {
      recordHealthSnapshots({ a: i, b: 100 - i }, new Date(start.getTime() + i * 7 * 86_400_000));
    }
    const a = getHealthHistory("a");
    expect(a).toHaveLength(MAX_SNAPSHOTS_PER_PROJECT);
    expect(a[a.length - 1].score).toBe(MAX_SNAPSHOTS_PER_PROJECT + 4);
    expect(getHealthHistory("b")).toHaveLength(MAX_SNAPSHOTS_PER_PROJECT);
  });

  it("returns no trend until there are two weeks", () => {
    expect(getHealthTrend([])).toBeNull();
    expect(getHealthTrend([{ week: "2026-10-19", score: 10 }])).toBeNull();
  });

  it("ignores corrupt storage", () => {
    localStorage.setItem(HEALTH_SNAPSHOT_STORAGE_KEY, "{not json");
    expect(getHealthHistory("p1")).toEqual([]);
    localStorage.setItem(
      HEALTH_SNAPSHOT_STORAGE_KEY,
      JSON.stringify({ p1: [{ week: "2026-10-19", score: 40 }, { week: "bad", score: "x" }] }),
    );
    expect(getHealthHistory("p1")).toEqual([{ week: "2026-10-19", score: 40 }]);
  });

  it("survives storage write failures", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    expect(() => recordHealthSnapshot("p1", 10, NOW)).not.toThrow();
    spy.mockRestore();
  });
});
