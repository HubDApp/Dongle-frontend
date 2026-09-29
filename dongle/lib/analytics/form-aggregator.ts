/**
 * Form analytics aggregation (Issues #522 & #523)
 *
 * Collects field-interaction events and validation performance data emitted
 * by useFormAnalytics and makes them available for the dashboard.
 *
 * All data is aggregated in-memory and keyed by (formId, fieldName) so that
 * no raw user input is ever stored — only counts, durations, and error codes.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldInteractionStats {
  /** Human-readable field identifier. */
  fieldName: string;
  /** Form this field belongs to. */
  formId: string;
  /** Number of times the field received focus. */
  focusCount: number;
  /** Number of change events (debounced). */
  changeCount: number;
  /** Number of validation errors recorded on this field. */
  validationErrors: number;
  /** Number of successful validations. */
  validationSuccesses: number;
  /** Most frequently seen error codes for this field, sorted by frequency. */
  topErrorCodes: Array<{ code: string; count: number }>;
}

export interface ValidationPerfStats {
  fieldName: string | null;
  formId: string;
  /** Total number of validation measurements taken. */
  sampleCount: number;
  /** Arithmetic mean of all durations (ms). */
  avgDurationMs: number;
  /** Maximum observed duration (ms). */
  maxDurationMs: number;
  /** Minimum observed duration (ms). */
  minDurationMs: number;
  /** Count of measurements exceeding SLOW_THRESHOLD_MS. */
  slowCount: number;
  /** Average debounce delay across all measurements (ms), or null if not tracked. */
  avgDebounceDelayMs: number | null;
}

export interface FormSubmissionStats {
  formId: string;
  /** Total submission attempts. */
  attempts: number;
  /** Successful submissions. */
  successes: number;
  /** Failed submissions. */
  errors: number;
  /** User abandonments while form was dirty. */
  abandonments: number;
  /** Most frequently seen error codes, sorted by frequency. */
  topErrorCodes: Array<{ code: string; count: number }>;
  /** Average submission duration for successes (ms). */
  avgSuccessDurationMs: number | null;
}

export interface FormAnalyticsAggregates {
  fieldInteractions: FieldInteractionStats[];
  validationPerf: ValidationPerfStats[];
  submissions: FormSubmissionStats[];
  /** ISO timestamp of the last update. */
  updatedAt: string;
}

// ─── Internal state ───────────────────────────────────────────────────────────

const SLOW_THRESHOLD_MS = 100;

// Keyed by `${formId}::${fieldName}`
const fieldStats = new Map<string, FieldInteractionStats>();
// Keyed by `${formId}::${fieldName ?? "_form_"}`
const perfStats = new Map<string, { durations: number[]; debounceDelays: number[]; slowCount: number }>();
// Keyed by formId
const submissionStats = new Map<string, {
  attempts: number;
  successes: number;
  errors: number;
  abandonments: number;
  errorCodes: Map<string, number>;
  successDurations: number[];
}>();

function fieldKey(formId: string, fieldName: string): string {
  return `${formId}::${fieldName}`;
}

function perfKey(formId: string, fieldName: string | null): string {
  return `${formId}::${fieldName ?? "_form_"}`;
}

function getOrCreateField(formId: string, fieldName: string): FieldInteractionStats {
  const key = fieldKey(formId, fieldName);
  let stats = fieldStats.get(key);
  if (!stats) {
    stats = { formId, fieldName, focusCount: 0, changeCount: 0, validationErrors: 0, validationSuccesses: 0, topErrorCodes: [] };
    fieldStats.set(key, stats);
  }
  return stats;
}

function getOrCreateSubmission(formId: string) {
  let stats = submissionStats.get(formId);
  if (!stats) {
    stats = { attempts: 0, successes: 0, errors: 0, abandonments: 0, errorCodes: new Map(), successDurations: [] };
    submissionStats.set(formId, stats);
  }
  return stats;
}

// ─── Ingest functions (called by the analytics transport or useFormAnalytics) ─

/** Record a field focus event. */
export function recordFieldFocus(formId: string, fieldName: string): void {
  getOrCreateField(formId, fieldName).focusCount += 1;
}

/** Record a field change event. */
export function recordFieldChange(formId: string, fieldName: string): void {
  getOrCreateField(formId, fieldName).changeCount += 1;
}

/** Record a field validation outcome. */
export function recordFieldValidationOutcome(
  formId: string,
  fieldName: string,
  success: boolean,
  errorCode?: string,
): void {
  const stats = getOrCreateField(formId, fieldName);
  if (success) {
    stats.validationSuccesses += 1;
  } else {
    stats.validationErrors += 1;
    if (errorCode) {
      const existing = stats.topErrorCodes.find((e) => e.code === errorCode);
      if (existing) {
        existing.count += 1;
      } else {
        stats.topErrorCodes.push({ code: errorCode, count: 1 });
      }
      stats.topErrorCodes.sort((a, b) => b.count - a.count);
    }
  }
}

/** Record a validation performance measurement. */
export function recordValidationPerf(
  formId: string,
  fieldName: string | null,
  durationMs: number,
  debounceDelayMs?: number,
): void {
  const key = perfKey(formId, fieldName);
  let stats = perfStats.get(key);
  if (!stats) {
    stats = { durations: [], debounceDelays: [], slowCount: 0 };
    perfStats.set(key, stats);
  }
  stats.durations.push(durationMs);
  if (debounceDelayMs != null) stats.debounceDelays.push(debounceDelayMs);
  if (durationMs > SLOW_THRESHOLD_MS) stats.slowCount += 1;
}

/** Record a form submission attempt. */
export function recordSubmissionAttempt(formId: string): void {
  getOrCreateSubmission(formId).attempts += 1;
}

/** Record a form submission success. */
export function recordSubmissionSuccess(formId: string, durationMs?: number): void {
  const stats = getOrCreateSubmission(formId);
  stats.successes += 1;
  if (durationMs != null) stats.successDurations.push(durationMs);
}

/** Record a form submission error. */
export function recordSubmissionError(formId: string, errorCode: string): void {
  const stats = getOrCreateSubmission(formId);
  stats.errors += 1;
  stats.errorCodes.set(errorCode, (stats.errorCodes.get(errorCode) ?? 0) + 1);
}

/** Record a form abandonment. */
export function recordFormAbandonment(formId: string): void {
  getOrCreateSubmission(formId).abandonments += 1;
}

// ─── Aggregate read ────────────────────────────────────────────────────────────

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, n) => s + n, 0) / values.length;
}

/** Return a snapshot of all collected form analytics data. */
export function getFormAnalyticsAggregates(): FormAnalyticsAggregates {
  const fieldInteractions: FieldInteractionStats[] = [...fieldStats.values()].sort(
    (a, b) => b.focusCount - a.focusCount,
  );

  const validationPerf: ValidationPerfStats[] = [...perfStats.entries()].map(([key, raw]) => {
    const [formId, rawField] = key.split("::");
    const fieldName = rawField === "_form_" ? null : rawField;
    const durations = raw.durations;
    const avgDebounce = mean(raw.debounceDelays);
    return {
      formId,
      fieldName,
      sampleCount: durations.length,
      avgDurationMs: mean(durations) ?? 0,
      maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
      minDurationMs: durations.length > 0 ? Math.min(...durations) : 0,
      slowCount: raw.slowCount,
      avgDebounceDelayMs: avgDebounce,
    };
  }).sort((a, b) => b.avgDurationMs - a.avgDurationMs);

  const submissions: FormSubmissionStats[] = [...submissionStats.entries()].map(([formId, raw]) => ({
    formId,
    attempts: raw.attempts,
    successes: raw.successes,
    errors: raw.errors,
    abandonments: raw.abandonments,
    topErrorCodes: [...raw.errorCodes.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    avgSuccessDurationMs: mean(raw.successDurations),
  }));

  return {
    fieldInteractions,
    validationPerf,
    submissions,
    updatedAt: new Date().toISOString(),
  };
}

/** Reset all collected data (useful for testing). */
export function resetFormAnalyticsData(): void {
  fieldStats.clear();
  perfStats.clear();
  submissionStats.clear();
}
