/**
 * Default benchmark thresholds for form UX scoring.
 *
 * These values represent realistic baselines derived from typical web form
 * completion behaviour.  Pass a custom FormUXBenchmark to calculateFormUXScore
 * to override any of these for a specific form.
 */

import type { FormUXBenchmark } from "./types";

/**
 * Default benchmarks.
 *
 * - expectedCompletionTimeMs: 90 seconds — a reasonable target for a
 *   medium-length form (4–8 fields) with no copy-pasting.
 * - maxAcceptableErrors: 2 — showing the user more than two validation errors
 *   across the whole session starts to feel punishing.
 * - maxFieldChangesPerField: 3 — editing a field more than ~3 times on average
 *   suggests confusing labels or validation messages.
 */
export const DEFAULT_BENCHMARK: FormUXBenchmark = {
  expectedCompletionTimeMs: 90_000,
  maxAcceptableErrors: 2,
  maxFieldChangesPerField: 3,
};

/**
 * Compare a raw value against a benchmark threshold and return a 0–100 score
 * for that dimension.
 *
 * @param actual  - The measured value (must be >= 0).
 * @param ideal   - The benchmark / target value.
 * @param higherIsBetter - When true a higher actual is better (e.g. completion
 *   rate).  When false (default) a lower actual is better (e.g. error count).
 */
export function scoreDimension(
  actual: number,
  ideal: number,
  higherIsBetter = false,
): number {
  if (ideal <= 0) return 100;

  if (higherIsBetter) {
    // Clamp: perfect at >= ideal, zero at 0.
    return Math.round(Math.min(100, (actual / ideal) * 100));
  }

  // Lower-is-better: perfect at 0, degrades as actual approaches 2× ideal.
  const ratio = actual / ideal;
  const raw = Math.max(0, 1 - ratio / 2) * 100;
  return Math.round(raw);
}
