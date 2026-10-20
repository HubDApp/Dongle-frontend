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

/**
 * Tracks a form submission attempt.
 * `formType` identifies the form (e.g. "project", "verification", "review").
 */
export function trackFormSubmit(opts: {
  formType: string;
  fieldCount: number;
  walletAddress?: string | null;
}): void {
  track("form_submit", {
    form_type: opts.formType,
    field_count: opts.fieldCount,
    ...withWalletFingerprint({}, opts.walletAddress),
  });
}

/** Tracks a successful form submission. */
export function trackFormSubmitSuccess(opts: {
  formType: string;
  fieldCount: number;
  walletAddress?: string | null;
}): void {
  track("form_submit_success", {
    form_type: opts.formType,
    field_count: opts.fieldCount,
    ...withWalletFingerprint({}, opts.walletAddress),
  });
}

/** Tracks a form submission error. */
export function trackFormSubmitError(opts: {
  formType: string;
  fieldCount: number;
  errorCode: string;
  walletAddress?: string | null;
}): void {
  track("form_submit_error", {
    form_type: opts.formType,
    field_count: opts.fieldCount,
    error_code: opts.errorCode,
    ...withWalletFingerprint({}, opts.walletAddress),
  });
}

/** Tracks a field value change for completion-rate tracking. */
export function trackFormFieldChange(opts: {
  formType: string;
  fieldName: string;
  fieldIndex: number;
  totalFields: number;
}): void {
  track("form_field_change", {
    form_type: opts.formType,
    field_name: opts.fieldName,
    field_index: opts.fieldIndex,
    total_fields: opts.totalFields,
  });
}

/** Tracks a user abandoning a form without submitting. */
export function trackFormAbandon(opts: {
  formType: string;
  fieldCount: number;
  touchedFields: number;
  walletAddress?: string | null;
}): void {
  track("form_abandon", {
    form_type: opts.formType,
    field_count: opts.fieldCount,
    touched_fields: opts.touchedFields,
    ...withWalletFingerprint({}, opts.walletAddress),
  });
}

/** Tracks that a form backup was created. */
export function trackFormBackupCreated(opts: {
  formType: string;
  formId: string;
  backupId: string;
  backupCount: number;
}): void {
  track("form_backup_created", {
    form_type: opts.formType,
    form_id: opts.formId,
    backup_id: opts.backupId,
    backup_count: opts.backupCount,
  });
}

/** Tracks that a form backup was restored. */
export function trackFormBackupRestored(opts: {
  formType: string;
  formId: string;
  backupId: string;
  restoredFromAgeMs: number;
}): void {
  track("form_backup_restored", {
    form_type: opts.formType,
    form_id: opts.formId,
    backup_id: opts.backupId,
    restored_from_age_ms: opts.restoredFromAgeMs,
  });
}

/** Tracks a form backup failure. */
export function trackFormBackupFailed(opts: {
  formType: string;
  formId: string;
  errorCode: string;
}): void {
  track("form_backup_failed", {
    form_type: opts.formType,
    form_id: opts.formId,
    error_code: opts.errorCode,
  });
}

/** Tracks that the backup retention policy cleaned up old backups. */
export function trackFormBackupRetentionCleaned(opts: {
  formType: string;
  formId: string;
  removedCount: number;
  remainingCount: number;
}): void {
  track("form_backup_retention_cleaned", {
    form_type: opts.formType,
    form_id: opts.formId,
    removed_count: opts.removedCount,
    remaining_count: opts.remainingCount,
  });
}

/** Tracks that a backup was archived. */
export function trackFormArchiveCreated(opts: {
  formType: string;
  formId: string;
  backupId: string;
  archivedCount: number;
}): void {
  track("form_archive_created", {
    form_type: opts.formType,
    form_id: opts.formId,
    backup_id: opts.backupId,
    archived_count: opts.archivedCount,
  });
}

/** Tracks that an archived backup was restored. */
export function trackFormArchiveRestored(opts: {
  formType: string;
  formId: string;
  backupId: string;
}): void {
  track("form_archive_restored", {
    form_type: opts.formType,
    form_id: opts.formId,
    backup_id: opts.backupId,
  });
}

/** Tracks a search performed on archived backups. */
export function trackFormArchiveSearch(opts: {
  formType: string;
  formId: string;
  queryLength: number;
  resultCount: number;
}): void {
  track("form_archive_search", {
    form_type: opts.formType,
    form_id: opts.formId,
    query_length: opts.queryLength,
    result_count: opts.resultCount,
  });
}

/** Tracks that an archived backup was deleted. */
export function trackFormArchiveDeleted(opts: {
  formType: string;
  formId: string;
  backupId: string;
}): void {
  track("form_archive_deleted", {
    form_type: opts.formType,
    form_id: opts.formId,
    backup_id: opts.backupId,
  });
}

/** Tracks that the archive retention policy cleaned up old archived backups. */
export function trackFormArchiveRetentionCleaned(opts: {
  formType: string;
  formId: string;
  removedCount: number;
  remainingCount: number;
}): void {
  track("form_archive_retention_cleaned", {
    form_type: opts.formType,
    form_id: opts.formId,
    removed_count: opts.removedCount,
    remaining_count: opts.remainingCount,
  });
}

/** Tracks that user consent was given for form data processing. */
export function trackConsentGiven(opts: {
  formType: string;
  formId: string;
  userId: string;
  purposes: string[];
}): void {
  track("consent_given", {
    form_type: opts.formType,
    form_id: opts.formId,
    user_id: opts.userId,
    purposes: opts.purposes.join(","),
  });
}

/** Tracks that user consent was withdrawn for form data processing. */
export function trackConsentWithdrawn(opts: {
  formType: string;
  formId: string;
  userId: string;
}): void {
  track("consent_withdrawn", {
    form_type: opts.formType,
    form_id: opts.formId,
    user_id: opts.userId,
  });
}

/** Tracks that a user exported their form data. */
export function trackDataExport(opts: {
  formType: string;
  formId: string;
  userId: string;
  recordCount: number;
}): void {
  track("data_export", {
    form_type: opts.formType,
    form_id: opts.formId,
    user_id: opts.userId,
    record_count: opts.recordCount,
  });
}

/** Tracks that a user requested data deletion. */
export function trackDataDeletionRequested(opts: {
  formType: string;
  formId: string;
  userId: string;
}): void {
  track("data_deletion_requested", {
    form_type: opts.formType,
    form_id: opts.formId,
    user_id: opts.userId,
  });
}

/** Tracks that data deletion was completed. */
export function trackDataDeletionCompleted(opts: {
  formType: string;
  formId: string;
  userId: string;
  backupsDeleted: number;
  archivesDeleted: number;
  consentRecordsDeleted: number;
}): void {
  track("data_deletion_completed", {
    form_type: opts.formType,
    form_id: opts.formId,
    user_id: opts.userId,
    backups_deleted: opts.backupsDeleted,
    archives_deleted: opts.archivesDeleted,
    consent_records_deleted: opts.consentRecordsDeleted,
  });
}
