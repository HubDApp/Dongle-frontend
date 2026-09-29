/**
 * Core form UX scoring logic.
 *
 * calculateFormUXScore() is a pure function: given metrics and benchmarks it
 * returns a fully-populated FormUXScore with a 0–100 overall score,
 * per-dimension breakdowns, identified pain points, and improvement
 * suggestions.
 */

import { DEFAULT_BENCHMARK, scoreDimension } from "./benchmarks";
import type {
  FormUXBenchmark,
  FormUXMetrics,
  FormUXScore,
  PainPoint,
} from "./types";

// ---------------------------------------------------------------------------
// Dimension weights (must sum to 1)
// ---------------------------------------------------------------------------

const WEIGHTS = {
  completionTime: 0.25,
  errorRate: 0.35,
  correctionEffort: 0.2,
  completion: 0.2,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreLabel(
  score: number,
): FormUXScore["label"] {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

function avgFieldChanges(metrics: FormUXMetrics): number {
  const fields = Object.values(metrics.fields);
  if (fields.length === 0) return 0;
  const total = fields.reduce((sum, f) => sum + f.changeCount, 0);
  return total / fields.length;
}

function elapsedMs(metrics: FormUXMetrics): number {
  if (metrics.startedAt === 0) return 0;
  const end =
    metrics.completedAt > 0 ? metrics.completedAt : Date.now();
  return Math.max(0, end - metrics.startedAt);
}

// ---------------------------------------------------------------------------
// Pain-point detection
// ---------------------------------------------------------------------------

function detectPainPoints(
  metrics: FormUXMetrics,
  benchmark: FormUXBenchmark,
  dimensions: FormUXScore["dimensions"],
): PainPoint[] {
  const points: PainPoint[] = [];

  // High error rate
  if (metrics.totalErrors > benchmark.maxAcceptableErrors * 2) {
    points.push({
      id: "high_error_rate",
      severity: "high",
      description: `Users encountered ${metrics.totalErrors} validation errors (threshold: ${benchmark.maxAcceptableErrors}).`,
      suggestion:
        "Add inline field-level guidance and validate on change rather than only on submit.",
    });
  } else if (metrics.totalErrors > benchmark.maxAcceptableErrors) {
    points.push({
      id: "moderate_error_rate",
      severity: "medium",
      description: `Users encountered ${metrics.totalErrors} validation errors.`,
      suggestion:
        "Consider softening validation messages and showing requirements upfront.",
    });
  }

  // Slow completion
  const elapsed = elapsedMs(metrics);
  if (elapsed > benchmark.expectedCompletionTimeMs * 2) {
    points.push({
      id: "very_slow_completion",
      severity: "high",
      description: `Form took ${Math.round(elapsed / 1000)}s to complete (expected ≤ ${Math.round(benchmark.expectedCompletionTimeMs / 1000)}s).`,
      suggestion:
        "Reduce the number of fields, split into steps, or prefill known data.",
    });
  } else if (elapsed > benchmark.expectedCompletionTimeMs * 1.4) {
    points.push({
      id: "slow_completion",
      severity: "medium",
      description: `Form took ${Math.round(elapsed / 1000)}s to complete.`,
      suggestion: "Investigate which fields cause the most hesitation.",
    });
  }

  // Excessive correction effort
  const avgChanges = avgFieldChanges(metrics);
  if (avgChanges > benchmark.maxFieldChangesPerField * 2) {
    points.push({
      id: "excessive_correction",
      severity: "high",
      description: `Fields were edited on average ${avgChanges.toFixed(1)} times (threshold: ${benchmark.maxFieldChangesPerField}).`,
      suggestion:
        "Clarify field labels, provide examples, and surface validation errors inline.",
    });
  } else if (avgChanges > benchmark.maxFieldChangesPerField) {
    points.push({
      id: "high_correction",
      severity: "medium",
      description: `Fields were edited on average ${avgChanges.toFixed(1)} times.`,
      suggestion:
        "Add placeholder text and tooltip hints to reduce trial-and-error.",
    });
  }

  // Multiple failed submit attempts
  if (metrics.failedSubmits >= 3) {
    points.push({
      id: "repeated_submit_failures",
      severity: "high",
      description: `Users hit ${metrics.failedSubmits} failed submit attempts.`,
      suggestion:
        "Run validation on blur so users see errors before they reach the submit button.",
    });
  } else if (metrics.failedSubmits >= 1) {
    points.push({
      id: "submit_failure",
      severity: "low",
      description: `Submit was attempted ${metrics.failedSubmits + metrics.submitAttempts} time(s) with at least one failure.`,
      suggestion:
        "Ensure the submit button is disabled when required fields are empty.",
    });
  }

  // Abandonment
  if (metrics.abandoned) {
    points.push({
      id: "abandoned",
      severity: dimensions.completion < 30 ? "high" : "medium",
      description: "The user abandoned the form without submitting.",
      suggestion:
        "Save form progress automatically so users can return and continue.",
    });
  }

  // Blank required fields on submit
  const blankOnSubmit = Object.values(metrics.fields).filter(
    (f) => f.submittedBlank,
  );
  if (blankOnSubmit.length > 0) {
    points.push({
      id: "blank_required_fields",
      severity: "medium",
      description: `${blankOnSubmit.length} field(s) were submitted blank.`,
      suggestion:
        "Mark required fields clearly and prevent submit until they are filled.",
    });
  }

  // Sort: high → medium → low
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return points.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Compute a FormUXScore from raw interaction metrics.
 *
 * @param metrics   - Collected during a form session by useFormUXScore.
 * @param benchmark - Override the default thresholds for this specific form.
 */
export function calculateFormUXScore(
  metrics: FormUXMetrics,
  benchmark: Partial<FormUXBenchmark> = {},
): FormUXScore {
  const bm: FormUXBenchmark = { ...DEFAULT_BENCHMARK, ...benchmark };

  // --- Dimension scores (0–100) ---

  // 1. Completion time
  const elapsed = elapsedMs(metrics);
  const completionTimeScore =
    elapsed === 0
      ? 100 // not started yet — neutral
      : scoreDimension(elapsed, bm.expectedCompletionTimeMs);

  // 2. Error rate
  const errorRateScore = scoreDimension(
    metrics.totalErrors,
    bm.maxAcceptableErrors,
  );

  // 3. Correction effort (avg field changes)
  const correctionEffortScore = scoreDimension(
    avgFieldChanges(metrics),
    bm.maxFieldChangesPerField,
  );

  // 4. Completion (0 or 100 based on whether form was submitted)
  const completionScore = metrics.completedAt > 0 ? 100 : 0;

  const dimensions = {
    completionTime: completionTimeScore,
    errorRate: errorRateScore,
    correctionEffort: correctionEffortScore,
    completion: completionScore,
  };

  // --- Weighted overall ---
  const overall = Math.round(
    dimensions.completionTime * WEIGHTS.completionTime +
      dimensions.errorRate * WEIGHTS.errorRate +
      dimensions.correctionEffort * WEIGHTS.correctionEffort +
      dimensions.completion * WEIGHTS.completion,
  );

  const painPoints = detectPainPoints(metrics, bm, dimensions);

  // De-duplicate improvement suggestions
  const seen = new Set<string>();
  const improvements: string[] = [];
  for (const pp of painPoints) {
    if (!seen.has(pp.suggestion)) {
      seen.add(pp.suggestion);
      improvements.push(pp.suggestion);
    }
  }

  return {
    overall,
    label: scoreLabel(overall),
    dimensions,
    painPoints,
    improvements,
    metrics,
    calculatedAt: new Date().toISOString(),
  };
}
