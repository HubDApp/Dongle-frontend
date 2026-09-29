/**
 * Unit tests for dongle/lib/form-ux/score.ts
 *
 * Tests cover:
 * - calculateFormUXScore with a perfect session
 * - calculateFormUXScore with a degraded session (errors, slowness, abandonment)
 * - scoreDimension helper (both lower-is-better and higher-is-better modes)
 * - Pain-point detection and severity ordering
 * - Improvement suggestion de-duplication
 * - Custom benchmark overrides
 * - Edge cases (empty metrics, zero-duration, no fields)
 */

import { describe, it, expect } from "vitest";
import { calculateFormUXScore } from "@/lib/form-ux/score";
import { scoreDimension } from "@/lib/form-ux/benchmarks";
import type { FormUXMetrics } from "@/lib/form-ux/types";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const NOW = 1_700_000_000_000;

function makeMetrics(overrides: Partial<FormUXMetrics> = {}): FormUXMetrics {
  return {
    startedAt: 0,
    completedAt: 0,
    submitAttempts: 0,
    failedSubmits: 0,
    abandoned: false,
    totalErrors: 0,
    fields: {},
    ...overrides,
  };
}

function perfectMetrics(): FormUXMetrics {
  return makeMetrics({
    startedAt: NOW,
    completedAt: NOW + 60_000, // 60 s — under the 90 s benchmark
    submitAttempts: 1,
    failedSubmits: 0,
    totalErrors: 0,
    fields: {
      name: { changeCount: 1, errorCount: 0, firstFocusedAt: NOW, lastBlurredAt: NOW + 5_000, submittedBlank: false },
      email: { changeCount: 1, errorCount: 0, firstFocusedAt: NOW + 6_000, lastBlurredAt: NOW + 15_000, submittedBlank: false },
    },
  });
}

function degradedMetrics(): FormUXMetrics {
  return makeMetrics({
    startedAt: NOW,
    completedAt: 0,          // never finished
    submitAttempts: 4,
    failedSubmits: 3,
    abandoned: true,
    totalErrors: 8,
    fields: {
      name: { changeCount: 7, errorCount: 3, firstFocusedAt: NOW, lastBlurredAt: NOW + 5_000, submittedBlank: false },
      email: { changeCount: 6, errorCount: 2, firstFocusedAt: NOW + 6_000, lastBlurredAt: NOW + 60_000, submittedBlank: true },
      url: { changeCount: 5, errorCount: 3, firstFocusedAt: NOW + 65_000, lastBlurredAt: NOW + 200_000, submittedBlank: true },
    },
  });
}

// ---------------------------------------------------------------------------
// scoreDimension
// ---------------------------------------------------------------------------

describe("scoreDimension", () => {
  it("returns 100 when actual is 0 (lower-is-better)", () => {
    expect(scoreDimension(0, 90_000)).toBe(100);
  });

  it("returns 0 when actual is 2× ideal (lower-is-better)", () => {
    expect(scoreDimension(180_000, 90_000)).toBe(0);
  });

  it("returns ~50 when actual equals ideal (lower-is-better)", () => {
    expect(scoreDimension(90_000, 90_000)).toBe(50);
  });

  it("returns 100 when actual >= ideal (higher-is-better)", () => {
    expect(scoreDimension(100, 100, true)).toBe(100);
    expect(scoreDimension(150, 100, true)).toBe(100);
  });

  it("returns proportional score (higher-is-better)", () => {
    expect(scoreDimension(50, 100, true)).toBe(50);
  });

  it("returns 100 when ideal is 0 (guard against division by zero)", () => {
    expect(scoreDimension(5, 0)).toBe(100);
    expect(scoreDimension(5, 0, true)).toBe(100);
  });

  it("clamps negative actual to 0", () => {
    // scoreDimension doesn't accept negative but should not blow up
    expect(scoreDimension(-10, 100)).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// calculateFormUXScore — perfect session
// ---------------------------------------------------------------------------

describe("calculateFormUXScore — perfect session", () => {
  it("returns a score object with the correct shape", () => {
    const result = calculateFormUXScore(perfectMetrics());
    expect(result).toHaveProperty("overall");
    expect(result).toHaveProperty("label");
    expect(result).toHaveProperty("dimensions");
    expect(result).toHaveProperty("painPoints");
    expect(result).toHaveProperty("improvements");
    expect(result).toHaveProperty("metrics");
    expect(result).toHaveProperty("calculatedAt");
  });

  it("assigns a high overall score for a perfect session", () => {
    const result = calculateFormUXScore(perfectMetrics());
    expect(result.overall).toBeGreaterThanOrEqual(70);
  });

  it("labels a high score as 'excellent' or 'good'", () => {
    const result = calculateFormUXScore(perfectMetrics());
    expect(["excellent", "good"]).toContain(result.label);
  });

  it("returns no pain points for a perfect session", () => {
    const result = calculateFormUXScore(perfectMetrics());
    expect(result.painPoints).toHaveLength(0);
  });

  it("returns no improvements for a perfect session", () => {
    const result = calculateFormUXScore(perfectMetrics());
    expect(result.improvements).toHaveLength(0);
  });

  it("records the completion dimension as 100 when completedAt is set", () => {
    const result = calculateFormUXScore(perfectMetrics());
    expect(result.dimensions.completion).toBe(100);
  });

  it("sets calculatedAt to a valid ISO timestamp", () => {
    const result = calculateFormUXScore(perfectMetrics());
    expect(() => new Date(result.calculatedAt)).not.toThrow();
    expect(new Date(result.calculatedAt).getTime()).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// calculateFormUXScore — degraded session
// ---------------------------------------------------------------------------

describe("calculateFormUXScore — degraded session", () => {
  it("returns a low overall score", () => {
    const result = calculateFormUXScore(degradedMetrics());
    expect(result.overall).toBeLessThan(50);
  });

  it("labels a low score as 'poor'", () => {
    const result = calculateFormUXScore(degradedMetrics());
    expect(result.label).toBe("poor");
  });

  it("records completion dimension as 0 when form was not submitted", () => {
    const result = calculateFormUXScore(degradedMetrics());
    expect(result.dimensions.completion).toBe(0);
  });

  it("detects high error rate pain point", () => {
    const result = calculateFormUXScore(degradedMetrics());
    const ids = result.painPoints.map((p) => p.id);
    expect(ids).toContain("high_error_rate");
  });

  it("detects repeated submit failure pain point", () => {
    const result = calculateFormUXScore(degradedMetrics());
    const ids = result.painPoints.map((p) => p.id);
    expect(ids).toContain("repeated_submit_failures");
  });

  it("detects abandonment pain point", () => {
    const result = calculateFormUXScore(degradedMetrics());
    const ids = result.painPoints.map((p) => p.id);
    expect(ids).toContain("abandoned");
  });

  it("detects excessive correction pain point", () => {
    const result = calculateFormUXScore(degradedMetrics());
    const ids = result.painPoints.map((p) => p.id);
    expect(ids).toContain("excessive_correction");
  });

  it("detects blank required fields pain point", () => {
    const result = calculateFormUXScore(degradedMetrics());
    const ids = result.painPoints.map((p) => p.id);
    expect(ids).toContain("blank_required_fields");
  });

  it("orders pain points high → medium → low", () => {
    const result = calculateFormUXScore(degradedMetrics());
    const severityOrder = { high: 0, medium: 1, low: 2 };
    for (let i = 0; i < result.painPoints.length - 1; i++) {
      expect(severityOrder[result.painPoints[i].severity]).toBeLessThanOrEqual(
        severityOrder[result.painPoints[i + 1].severity],
      );
    }
  });

  it("provides at least one improvement suggestion", () => {
    const result = calculateFormUXScore(degradedMetrics());
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it("de-duplicates improvement suggestions", () => {
    const result = calculateFormUXScore(degradedMetrics());
    const unique = new Set(result.improvements);
    expect(unique.size).toBe(result.improvements.length);
  });
});

// ---------------------------------------------------------------------------
// Custom benchmarks
// ---------------------------------------------------------------------------

describe("calculateFormUXScore — custom benchmarks", () => {
  it("uses a tight time benchmark to lower the score", () => {
    const metrics = perfectMetrics(); // completed in 60 s
    const defaultResult = calculateFormUXScore(metrics);
    // With a very tight 10 s benchmark the completionTime dimension should drop
    const tightResult = calculateFormUXScore(metrics, {
      expectedCompletionTimeMs: 10_000,
    });
    expect(tightResult.dimensions.completionTime).toBeLessThan(
      defaultResult.dimensions.completionTime,
    );
  });

  it("uses a lenient error benchmark to raise the score", () => {
    const metrics = makeMetrics({
      startedAt: NOW,
      completedAt: NOW + 60_000,
      submitAttempts: 1,
      failedSubmits: 1,
      totalErrors: 3,
      fields: {},
    });
    const strictResult = calculateFormUXScore(metrics); // default maxAcceptableErrors = 2
    const lenientResult = calculateFormUXScore(metrics, {
      maxAcceptableErrors: 10,
    });
    expect(lenientResult.dimensions.errorRate).toBeGreaterThan(
      strictResult.dimensions.errorRate,
    );
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("calculateFormUXScore — edge cases", () => {
  it("handles completely empty metrics without throwing", () => {
    expect(() => calculateFormUXScore(makeMetrics())).not.toThrow();
  });

  it("returns overall >= 0 for empty metrics", () => {
    const result = calculateFormUXScore(makeMetrics());
    expect(result.overall).toBeGreaterThanOrEqual(0);
  });

  it("handles metrics with no fields object entries", () => {
    const metrics = makeMetrics({
      startedAt: NOW,
      completedAt: NOW + 45_000,
      submitAttempts: 1,
      totalErrors: 0,
    });
    const result = calculateFormUXScore(metrics);
    expect(result.overall).toBeGreaterThan(0);
  });

  it("clamps overall score to [0, 100]", () => {
    // Artificially bad metrics
    const bad = makeMetrics({ totalErrors: 9999, submitAttempts: 100, failedSubmits: 99, abandoned: true });
    const result = calculateFormUXScore(bad);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("includes the original metrics in the returned object", () => {
    const m = perfectMetrics();
    const result = calculateFormUXScore(m);
    expect(result.metrics).toEqual(m);
  });
});
