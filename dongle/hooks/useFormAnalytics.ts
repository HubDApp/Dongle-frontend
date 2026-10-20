/**
 * useFormAnalytics
 *
 * Reusable hook that instruments any react-hook-form form with:
 *   - Issue #521: submission attempt / success / error / abandonment tracking
 *   - Issue #522: field focus / change / validation tracking
 *   - Issue #523: validation performance measurement
 *
 * Usage:
 *   const analytics = useFormAnalytics({ formId: "project-submit", fieldCount: 10 });
 *
 *   // Wrap your submit handler:
 *   const onSubmit = analytics.wrapSubmit(async (data) => { ... });
 *
 *   // Spread onto each field's input/textarea:
 *   <input {...analytics.fieldHandlers("name")} />
 *
 *   // Measure validation timing around any async validator:
 *   await analytics.measureValidation("websiteUrl", async () => { ... });
 */

import { useCallback, useEffect, useRef } from "react";
import {
  trackFormAbandonment,
  trackFormFieldChange,
  trackFormFieldFocus,
  trackFormFieldValidation,
  trackFormSubmissionAttempt,
  trackFormSubmissionError,
  trackFormSubmissionSuccess,
  trackFormValidationPerformance,
} from "@/lib/analytics";
import {
  recordFieldFocus,
  recordFieldChange,
  recordFieldValidationOutcome,
  recordValidationPerf,
  recordSubmissionAttempt,
  recordSubmissionSuccess,
  recordSubmissionError,
  recordFormAbandonment,
} from "@/lib/analytics/form-aggregator";

/** Threshold above which a validation is flagged as "slow" in analytics. */
const SLOW_VALIDATION_THRESHOLD_MS = 100;

/** Debounce delay used for field-change events (ms). */
const FIELD_CHANGE_DEBOUNCE_MS = 500;

export interface UseFormAnalyticsOptions {
  /** Stable identifier for this form, e.g. "project-submit" or "review". */
  formId: string;
  /** Total number of fields in the form, used for abandonment context. */
  fieldCount?: number;
  /**
   * Whether the form is currently "dirty" (has unsaved user input).
   * When `true` and the component unmounts, an abandonment event fires.
   * Provide this from `formState.isDirty` if available.
   */
  isDirty?: boolean;
}

export interface FieldHandlers {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export interface UseFormAnalyticsReturn {
  /**
   * Wraps an async submit handler with attempt / success / error analytics.
   * Pass the error's `code` or `name` to surface it in the dashboard.
   */
  wrapSubmit: <T>(
    handler: (data: T, hasErrors?: boolean) => Promise<void>,
    opts?: { hasErrors?: boolean }
  ) => (data: T) => Promise<void>;

  /**
   * Returns focus/change/blur handlers for a named field.
   * Spread these onto `<input>`, `<textarea>`, or `<select>` elements:
   *   `<input {...analytics.fieldHandlers("websiteUrl")} />`
   *
   * Works alongside react-hook-form's `register()` — just merge the spreads.
   */
  fieldHandlers: (fieldName: string) => FieldHandlers;

  /**
   * Wraps an async validation function, measuring its duration and emitting
   * a `form_validation_performance` event.
   * Returns the inner function's result unchanged.
   */
  measureValidation: <T>(
    fieldName: string,
    fn: () => Promise<T>,
    debounceDelayMs?: number
  ) => Promise<T>;

  /**
   * Manually record a validation outcome for a field.
   * Useful when validation errors come from react-hook-form's `formState.errors`.
   */
  recordFieldValidation: (fieldName: string, success: boolean, errorCode?: string) => void;

  /**
   * Manually fire the abandonment event with current state.
   * Typically not needed — the hook fires it automatically on unmount when dirty.
   */
  trackAbandonment: () => void;
}

export function useFormAnalytics({
  formId,
  fieldCount,
  isDirty = false,
}: UseFormAnalyticsOptions): UseFormAnalyticsReturn {
  // Track when the form was first mounted / focused for time-spent calculations
  const mountedAtRef = useRef<number>(Date.now());
  const lastInteractedFieldRef = useRef<string | null>(null);
  const filledFieldsRef = useRef<Set<string>>(new Set());
  const isDirtyRef = useRef(isDirty);
  const submissionStartRef = useRef<number | null>(null);

  // Keep isDirtyRef in sync without triggering effects
  isDirtyRef.current = isDirty;

  // Per-field debounce timers
  const changeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Abandonment on unmount ────────────────────────────────────────────────
  const trackAbandonmentFn = useCallback(() => {
    if (!isDirtyRef.current) return;
    const timeSpentMs = Date.now() - mountedAtRef.current;
    trackFormAbandonment({
      formId,
      lastInteractedField: lastInteractedFieldRef.current ?? undefined,
      filledFieldCount: filledFieldsRef.current.size,
      totalFieldCount: fieldCount,
      timeSpentMs,
    });
    // Aggregate locally (issue #521)
    recordFormAbandonment(formId);
  }, [formId, fieldCount]);

  useEffect(() => {
    return () => {
      // Clear any pending debounce timers
      for (const timer of changeTimersRef.current.values()) {
        clearTimeout(timer);
      }
      // Emit abandonment if the form was dirty when unmounted
      trackAbandonmentFn();
    };
  }, [trackAbandonmentFn]);

  // ── Submission wrapper ────────────────────────────────────────────────────
  const wrapSubmit = useCallback(
    <T>(
      handler: (data: T, hasErrors?: boolean) => Promise<void>,
      opts?: { hasErrors?: boolean }
    ) =>
      async (data: T): Promise<void> => {
        trackFormSubmissionAttempt({
          formId,
          fieldCount,
          hasErrors: opts?.hasErrors ?? false,
        });
        // Aggregate locally (issue #521)
        recordSubmissionAttempt(formId);
        submissionStartRef.current = Date.now();
        try {
          await handler(data, opts?.hasErrors);
          const durationMs =
            submissionStartRef.current != null
              ? Date.now() - submissionStartRef.current
              : undefined;
          trackFormSubmissionSuccess({ formId, durationMs });
          // Aggregate locally (issue #521)
          recordSubmissionSuccess(formId, durationMs);
        } catch (err: unknown) {
          const code =
            err instanceof Error
              ? (err as Error & { code?: string }).code ?? err.name ?? "Error"
              : "unknown";
          trackFormSubmissionError({
            formId,
            errorCode: code,
            errorType: isNetworkError(err)
              ? "network"
              : isValidationError(err)
              ? "validation"
              : "unknown",
          });
          // Aggregate locally (issue #521)
          recordSubmissionError(formId, code);
          // Re-throw so the form's own error handling still works
          throw err;
        }
      },
    [formId, fieldCount]
  );

  // ── Field handlers ────────────────────────────────────────────────────────
  const fieldHandlers = useCallback(
    (fieldName: string): FieldHandlers => ({
      onFocus: () => {
        lastInteractedFieldRef.current = fieldName;
        trackFormFieldFocus({ formId, fieldName });
        // Aggregate locally (issue #522)
        recordFieldFocus(formId, fieldName);
      },
      onChange: (e) => {
        lastInteractedFieldRef.current = fieldName;
        const hasValue = e.target.value.trim().length > 0;
        if (hasValue) {
          filledFieldsRef.current.add(fieldName);
        } else {
          filledFieldsRef.current.delete(fieldName);
        }
        // Debounce to avoid flooding on rapid typing
        const existing = changeTimersRef.current.get(fieldName);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          trackFormFieldChange({ formId, fieldName, hasValue });
          // Aggregate locally (issue #522)
          recordFieldChange(formId, fieldName);
          changeTimersRef.current.delete(fieldName);
        }, FIELD_CHANGE_DEBOUNCE_MS);
        changeTimersRef.current.set(fieldName, timer);
      },
      onBlur: (e) => {
        // Flush any pending change debounce on blur
        const existing = changeTimersRef.current.get(fieldName);
        if (existing) {
          clearTimeout(existing);
          changeTimersRef.current.delete(fieldName);
          const hasValue = e.target.value.trim().length > 0;
          trackFormFieldChange({ formId, fieldName, hasValue });
          // Aggregate locally (issue #522)
          recordFieldChange(formId, fieldName);
        }
      },
    }),
    [formId]
  );

  // ── Validation performance measurement ───────────────────────────────────
  const measureValidation = useCallback(
    async <T>(
      fieldName: string,
      fn: () => Promise<T>,
      debounceDelayMs?: number
    ): Promise<T> => {
      const start = performance.now();
      try {
        const result = await fn();
        const durationMs = Math.round(performance.now() - start);
        trackFormValidationPerformance({
          formId,
          fieldName,
          durationMs,
          isSlow: durationMs > SLOW_VALIDATION_THRESHOLD_MS,
          debounceDelayMs,
        });
        // Aggregate locally (issue #523)
        recordValidationPerf(formId, fieldName, durationMs, debounceDelayMs);
        return result;
      } catch (err) {
        const durationMs = Math.round(performance.now() - start);
        trackFormValidationPerformance({
          formId,
          fieldName,
          durationMs,
          isSlow: durationMs > SLOW_VALIDATION_THRESHOLD_MS,
          debounceDelayMs,
        });
        // Aggregate locally (issue #523)
        recordValidationPerf(formId, fieldName, durationMs, debounceDelayMs);
        throw err;
      }
    },
    [formId]
  );

  const recordFieldValidation = useCallback(
    (fieldName: string, success: boolean, errorCode?: string) => {
      trackFormFieldValidation({ formId, fieldName, success, errorCode });
      // Aggregate locally (issue #522)
      recordFieldValidationOutcome(formId, fieldName, success, errorCode);
    },
    [formId]
  );

  return {
    wrapSubmit,
    fieldHandlers,
    measureValidation,
    recordFieldValidation,
    trackAbandonment: trackAbandonmentFn,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "NetworkError" ||
    err.name === "TypeError" ||
    err.message.toLowerCase().includes("network") ||
    err.message.toLowerCase().includes("fetch")
  );
}

function isValidationError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "ZodError" ||
    err.name === "ValidationError" ||
    err.message.toLowerCase().includes("valid")
  );
}
