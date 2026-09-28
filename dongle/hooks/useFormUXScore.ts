/**
 * useFormUXScore
 *
 * A React hook that instruments a react-hook-form instance to collect
 * interaction metrics and compute a live FormUXScore.
 *
 * Usage:
 *
 *   const form = useForm<MyData>();
 *   const { score, metrics, reset: resetScore } = useFormUXScore(form, {
 *     benchmark: { expectedCompletionTimeMs: 60_000 },
 *     fieldNames: ['name', 'email', 'message'],
 *   });
 *
 *   // Attach field-level listeners in JSX:
 *   <input
 *     {...form.register('name')}
 *     onChange={(e) => { handlers.onChange('name', e); form.setValue('name', e.target.value); }}
 *     onFocus={() => handlers.onFocus('name')}
 *     onBlur={() => handlers.onBlur('name')}
 *   />
 *
 *   // Call when submit succeeds:
 *   const onValid = (data) => { handlers.onSubmitSuccess(); ... };
 *   // Call when submit fails:
 *   const onInvalid = (errors) => { handlers.onSubmitFailure(errors); ... };
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { calculateFormUXScore } from "@/lib/form-ux/score";
import type {
  FieldMetrics,
  FormUXBenchmark,
  FormUXMetrics,
  FormUXScore,
} from "@/lib/form-ux/types";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface UseFormUXScoreOptions {
  /**
   * Custom benchmark thresholds.  Partial — missing keys fall back to
   * DEFAULT_BENCHMARK.
   */
  benchmark?: Partial<FormUXBenchmark>;
  /**
   * Names of the fields to track.  When provided the hook pre-creates entries
   * for each field so metrics are available even before the user interacts.
   */
  fieldNames?: string[];
  /**
   * How often (in ms) to recompute the live score while the user is filling
   * out the form.  Defaults to 2 000 ms.
   */
  recalculateIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Return value
// ---------------------------------------------------------------------------

export interface UseFormUXScoreReturn {
  /** The latest computed score (null before the user starts interacting). */
  score: FormUXScore | null;
  /** The raw accumulated metrics. */
  metrics: FormUXMetrics;
  /**
   * Event handlers to wire up to form fields and the submit callback.
   * All handlers are stable references (useCallback).
   */
  handlers: {
    /** Call on every onChange event for a field. */
    onChange: (fieldName: string) => void;
    /** Call on focus for a field. */
    onFocus: (fieldName: string) => void;
    /** Call on blur for a field. */
    onBlur: (fieldName: string) => void;
    /** Call after a successful form submission. */
    onSubmitSuccess: () => void;
    /** Call after a failed form submission (validation errors). */
    onSubmitFailure: (errors?: FieldErrors) => void;
    /** Call when the user navigates away without submitting. */
    onAbandon: () => void;
  };
  /** Reset all metrics and the score back to initial state. */
  reset: () => void;
  /** Force an immediate score recalculation. */
  recalculate: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmptyMetrics(fieldNames: string[] = []): FormUXMetrics {
  const fields: Record<string, FieldMetrics> = {};
  for (const name of fieldNames) {
    fields[name] = {
      changeCount: 0,
      errorCount: 0,
      firstFocusedAt: 0,
      lastBlurredAt: 0,
      submittedBlank: false,
    };
  }
  return {
    startedAt: 0,
    completedAt: 0,
    submitAttempts: 0,
    failedSubmits: 0,
    abandoned: false,
    totalErrors: 0,
    fields,
  };
}

function ensureField(
  metrics: FormUXMetrics,
  fieldName: string,
): FieldMetrics {
  if (!metrics.fields[fieldName]) {
    metrics.fields[fieldName] = {
      changeCount: 0,
      errorCount: 0,
      firstFocusedAt: 0,
      lastBlurredAt: 0,
      submittedBlank: false,
    };
  }
  return metrics.fields[fieldName];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFormUXScore(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _form: UseFormReturn<any>,
  options: UseFormUXScoreOptions = {},
): UseFormUXScoreReturn {
  const {
    benchmark,
    fieldNames = [],
    recalculateIntervalMs = 2_000,
  } = options;

  // Mutable metrics stored in a ref so handlers don't go stale.
  const metricsRef = useRef<FormUXMetrics>(makeEmptyMetrics(fieldNames));

  // Mirror metrics into state so consumers can read them reactively.
  const [metrics, setMetrics] = useState<FormUXMetrics>(() =>
    makeEmptyMetrics(fieldNames),
  );
  const [score, setScore] = useState<FormUXScore | null>(null);

  // ---------------------------------------------------------------------------
  // Recalculation
  // ---------------------------------------------------------------------------

  const recalculate = useCallback(() => {
    const current = metricsRef.current;
    // Only score if the user has actually started interacting.
    if (current.startedAt === 0 && current.submitAttempts === 0) return;
    const computed = calculateFormUXScore(current, benchmark);
    setScore(computed);
    setMetrics({ ...current });
  }, [benchmark]);

  // Periodic recalculation while the form is in progress.
  useEffect(() => {
    const id = setInterval(() => {
      if (
        metricsRef.current.startedAt > 0 &&
        metricsRef.current.completedAt === 0 &&
        !metricsRef.current.abandoned
      ) {
        recalculate();
      }
    }, recalculateIntervalMs);
    return () => clearInterval(id);
  }, [recalculate, recalculateIntervalMs]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const markStarted = useCallback(() => {
    if (metricsRef.current.startedAt === 0) {
      metricsRef.current.startedAt = Date.now();
    }
  }, []);

  const onChange = useCallback(
    (fieldName: string) => {
      markStarted();
      const field = ensureField(metricsRef.current, fieldName);
      field.changeCount += 1;
    },
    [markStarted],
  );

  const onFocus = useCallback(
    (fieldName: string) => {
      markStarted();
      const field = ensureField(metricsRef.current, fieldName);
      if (field.firstFocusedAt === 0) {
        field.firstFocusedAt = Date.now();
      }
    },
    [markStarted],
  );

  const onBlur = useCallback((fieldName: string) => {
    const field = ensureField(metricsRef.current, fieldName);
    field.lastBlurredAt = Date.now();
  }, []);

  const onSubmitSuccess = useCallback(() => {
    metricsRef.current.submitAttempts += 1;
    metricsRef.current.completedAt = Date.now();
    recalculate();
  }, [recalculate]);

  const onSubmitFailure = useCallback(
    (errors?: FieldErrors) => {
      metricsRef.current.submitAttempts += 1;
      metricsRef.current.failedSubmits += 1;

      if (errors) {
        const errorFields = Object.keys(errors);
        for (const fieldName of errorFields) {
          const field = ensureField(metricsRef.current, fieldName);
          field.errorCount += 1;
          // Check if the field was submitted with an empty value.
          field.submittedBlank =
            field.submittedBlank ||
            errors[fieldName]?.type === "required" ||
            errors[fieldName]?.type === "min";
        }
        metricsRef.current.totalErrors += errorFields.length;
      }

      recalculate();
    },
    [recalculate],
  );

  const onAbandon = useCallback(() => {
    if (
      metricsRef.current.startedAt > 0 &&
      metricsRef.current.completedAt === 0
    ) {
      metricsRef.current.abandoned = true;
      recalculate();
    }
  }, [recalculate]);

  // Detect page unload as abandonment.
  useEffect(() => {
    const handleUnload = () => onAbandon();
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [onAbandon]);

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    metricsRef.current = makeEmptyMetrics(fieldNames);
    setMetrics(makeEmptyMetrics(fieldNames));
    setScore(null);
  }, [fieldNames]);

  return {
    score,
    metrics,
    handlers: {
      onChange,
      onFocus,
      onBlur,
      onSubmitSuccess,
      onSubmitFailure,
      onAbandon,
    },
    reset,
    recalculate,
  };
}
