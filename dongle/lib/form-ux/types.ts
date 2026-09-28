/**
 * Types for the form user-experience scoring system.
 *
 * The score is computed from raw interaction metrics collected while a user
 * fills out a form.  A higher score means a better experience.
 */

// ---------------------------------------------------------------------------
// Raw metrics collected by useFormUXScore
// ---------------------------------------------------------------------------

/** Severity of a pain point. */
export type PainPointSeverity = "low" | "medium" | "high";

/** A single identified friction point in the form experience. */
export interface PainPoint {
  /** Machine-readable identifier for the pain-point category. */
  id: string;
  /** Human-readable description of the problem. */
  description: string;
  /** How severe the impact on UX is. */
  severity: PainPointSeverity;
  /** Actionable suggestion for the form author to address this. */
  suggestion: string;
}

/** Per-field interaction data. */
export interface FieldMetrics {
  /** How many times the user changed this field's value. */
  changeCount: number;
  /** How many validation errors the user saw on this field. */
  errorCount: number;
  /** Epoch ms when the user first focused this field (0 if never touched). */
  firstFocusedAt: number;
  /** Epoch ms when the user last blurred this field (0 if still focused). */
  lastBlurredAt: number;
  /** Whether the field was ever left blank and submitted. */
  submittedBlank: boolean;
}

/** Aggregate metrics for an entire form interaction session. */
export interface FormUXMetrics {
  /** Epoch ms when the user first interacted with the form. */
  startedAt: number;
  /** Epoch ms when the form was submitted successfully (0 if not yet). */
  completedAt: number;
  /** How many times the user attempted to submit the form. */
  submitAttempts: number;
  /** How many submit attempts resulted in validation errors. */
  failedSubmits: number;
  /** Whether the user abandoned the form (navigated away without submitting). */
  abandoned: boolean;
  /** Total number of validation errors shown across all fields and submits. */
  totalErrors: number;
  /** Per-field breakdown. */
  fields: Record<string, FieldMetrics>;
}

// ---------------------------------------------------------------------------
// Scored output
// ---------------------------------------------------------------------------

/** The computed UX score plus derived insights. */
export interface FormUXScore {
  /**
   * Overall score from 0–100.
   * 90–100 = excellent, 70–89 = good, 50–69 = fair, <50 = poor.
   */
  overall: number;
  /** Label describing the overall tier. */
  label: "excellent" | "good" | "fair" | "poor";
  /** Breakdown of sub-dimension scores (each 0–100). */
  dimensions: {
    /** Time efficiency: how quickly the user completed relative to benchmark. */
    completionTime: number;
    /** Error rate: inverse of how many validation errors they hit. */
    errorRate: number;
    /** Correction effort: how much backtracking and re-editing occurred. */
    correctionEffort: number;
    /** Completion: did the user finish the form? */
    completion: number;
  };
  /** Identified friction points sorted by severity (high first). */
  painPoints: PainPoint[];
  /** Prioritised improvement suggestions (de-duplicated from painPoints). */
  improvements: string[];
  /** The raw metrics the score was derived from. */
  metrics: FormUXMetrics;
  /** ISO timestamp when the score was calculated. */
  calculatedAt: string;
}

// ---------------------------------------------------------------------------
// Benchmark configuration
// ---------------------------------------------------------------------------

/** Thresholds used to contextualise raw metrics. */
export interface FormUXBenchmark {
  /** Expected completion time in milliseconds for a typical user. */
  expectedCompletionTimeMs: number;
  /**
   * Maximum acceptable number of validation errors before UX is considered
   * degraded.
   */
  maxAcceptableErrors: number;
  /**
   * Maximum acceptable average change-count per field before correction
   * effort is considered high.
   */
  maxFieldChangesPerField: number;
}
