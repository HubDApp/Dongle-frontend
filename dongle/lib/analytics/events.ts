/**
 * Named helpers for core-journey analytics events.
 * Prefer these over calling `track()` with raw strings at call sites.
 */

import { track, withWalletFingerprint } from "./client";
import { bucketQueryLength } from "./privacy";
import type { AnalyticsProperties } from "./types";

export function trackPageView(path: string, properties?: AnalyticsProperties): void {
  track("page_view", {
    path,
    ...properties,
  });
}

export function trackWalletConnect(opts: {
  success: boolean;
  networkLabel?: string;
  walletAddress?: string | null;
  errorCode?: string;
}): void {
  if (opts.success) {
    track(
      "wallet_connect",
      withWalletFingerprint(
        {
          network: opts.networkLabel ?? null,
        },
        opts.walletAddress,
      ),
    );
  } else {
    track("wallet_connect_failed", {
      error_code: opts.errorCode ?? "unknown",
    });
  }
}

export function trackWalletDisconnect(): void {
  track("wallet_disconnect");
}

export function trackProjectView(
  projectId: string,
  properties?: AnalyticsProperties,
): void {
  track("project_view", {
    project_id: projectId,
    ...properties,
  });
}

/**
 * Search engagement without storing the raw query string.
 * Only length bucket + result count are emitted.
 */
export function trackSearch(opts: {
  queryLength: number;
  resultCount?: number;
  source?: string;
}): void {
  track("search", {
    query_length_bucket: bucketQueryLength(opts.queryLength),
    has_query: opts.queryLength > 0,
    result_count: opts.resultCount ?? null,
    source: opts.source ?? "discover",
  });
}

export function trackFilter(opts: {
  filterType: string;
  filterValue: string;
  source?: string;
}): void {
  track("filter", {
    filter_type: opts.filterType,
    filter_value: opts.filterValue,
    source: opts.source ?? "discover",
  });
}

export function trackProjectSubmit(opts: {
  success: boolean;
  mode: "create" | "edit";
  category?: string;
  projectId?: string;
  errorCode?: string;
}): void {
  if (opts.success) {
    track("project_submit", {
      mode: opts.mode,
      category: opts.category ?? null,
      project_id: opts.projectId ?? null,
    });
  } else {
    track("project_submit_failed", {
      mode: opts.mode,
      error_code: opts.errorCode ?? "unknown",
    });
  }
}

export function trackVerificationRequest(opts: {
  success: boolean;
  /** Opaque project identifier / domain — never a wallet. */
  projectRefLength?: number;
  errorCode?: string;
}): void {
  if (opts.success) {
    track("verification_request", {
      project_ref_length: opts.projectRefLength ?? null,
    });
  } else {
    track("verification_request_failed", {
      error_code: opts.errorCode ?? "unknown",
    });
  }
}

export function trackReviewSubmit(opts: {
  success: boolean;
  action: "create" | "update";
  projectId: string;
  rating?: number;
  commentLength?: number;
  walletAddress?: string | null;
  errorCode?: string;
}): void {
  const base = withWalletFingerprint(
    {
      action: opts.action,
      project_id: opts.projectId,
      rating: opts.rating ?? null,
      comment_length: opts.commentLength ?? null,
    },
    opts.walletAddress,
  );

  if (opts.success) {
    track(opts.action === "update" ? "review_update" : "review_submit", base);
  } else {
    track("review_submit_failed", {
      ...base,
      error_code: opts.errorCode ?? "unknown",
    });
  }
}

// ─── Issue #521: Form submission analytics ────────────────────────────────────

/**
 * Track that the user attempted to submit a form.
 * Called immediately before the submission handler fires.
 */
export function trackFormSubmissionAttempt(opts: {
  formId: string;
  fieldCount?: number;
  hasErrors?: boolean;
}): void {
  track("form_submission_attempt", {
    form_id: opts.formId,
    field_count: opts.fieldCount ?? null,
    has_errors: opts.hasErrors ?? false,
  });
}

/**
 * Track a successful form submission.
 */
export function trackFormSubmissionSuccess(opts: {
  formId: string;
  durationMs?: number;
}): void {
  track("form_submission_success", {
    form_id: opts.formId,
    duration_ms: opts.durationMs ?? null,
  });
}

/**
 * Track a form submission that resulted in an error.
 * Only the error code / type is sent — no user data.
 */
export function trackFormSubmissionError(opts: {
  formId: string;
  errorCode: string;
  errorType?: "validation" | "network" | "contract" | "unknown";
}): void {
  track("form_submission_error", {
    form_id: opts.formId,
    error_code: opts.errorCode,
    error_type: opts.errorType ?? "unknown",
  });
}

/**
 * Track user abandonment — fired when the form is unmounted while dirty.
 * No field values are included.
 */
export function trackFormAbandonment(opts: {
  formId: string;
  lastInteractedField?: string;
  filledFieldCount?: number;
  totalFieldCount?: number;
  timeSpentMs?: number;
}): void {
  track("form_abandonment", {
    form_id: opts.formId,
    last_interacted_field: opts.lastInteractedField ?? null,
    filled_field_count: opts.filledFieldCount ?? null,
    total_field_count: opts.totalFieldCount ?? null,
    time_spent_ms: opts.timeSpentMs ?? null,
  });
}

// ─── Issue #522: Form field interaction analytics ─────────────────────────────

/**
 * Track that a user focused a specific field.
 * Field name is sent as-is (must not be a PII field like "email").
 */
export function trackFormFieldFocus(opts: {
  formId: string;
  fieldName: string;
}): void {
  track("form_field_focus", {
    form_id: opts.formId,
    field_name: opts.fieldName,
  });
}

/**
 * Track that a user changed a field value (debounced at call sites).
 * No field value is ever sent.
 */
export function trackFormFieldChange(opts: {
  formId: string;
  fieldName: string;
  /** Whether the new value is non-empty. */
  hasValue: boolean;
}): void {
  track("form_field_change", {
    form_id: opts.formId,
    field_name: opts.fieldName,
    has_value: opts.hasValue,
  });
}

/**
 * Track a field-level validation outcome triggered by blur or submit.
 */
export function trackFormFieldValidation(opts: {
  formId: string;
  fieldName: string;
  success: boolean;
  errorCode?: string;
}): void {
  if (opts.success) {
    track("form_field_validation_success", {
      form_id: opts.formId,
      field_name: opts.fieldName,
    });
  } else {
    track("form_field_validation_error", {
      form_id: opts.formId,
      field_name: opts.fieldName,
      error_code: opts.errorCode ?? "unknown",
    });
  }
}

// ─── Issue #523: Form validation performance analytics ────────────────────────

/**
 * Track how long a validation pass took.
 * Slow validations (>100 ms) surface in the dashboard.
 */
export function trackFormValidationPerformance(opts: {
  formId: string;
  fieldName?: string;
  durationMs: number;
  isSlow?: boolean;
  debounceDelayMs?: number;
}): void {
  track("form_validation_performance", {
    form_id: opts.formId,
    field_name: opts.fieldName ?? null,
    duration_ms: opts.durationMs,
    is_slow: opts.isSlow ?? opts.durationMs > 100,
    debounce_delay_ms: opts.debounceDelayMs ?? null,
  });
}
