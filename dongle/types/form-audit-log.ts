/**
 * Form Audit Log Types
 *
 * A form audit entry records a single form interaction (a field change, a
 * submit attempt, …) together with the identity of the user who performed it
 * and the client IP stamped server-side.
 *
 * Admin mutations use `AuditLogEntry` (types/audit-log.ts); this type covers
 * user form interactions and is intentionally field-level.
 */

/** The set of form interactions that are recorded. */
export type FormAuditAction =
  | "field_change"
  | "form_submit"
  | "form_submit_failed"
  | "form_reset";

/** Human-readable labels for each action. */
export const FORM_AUDIT_ACTION_LABELS: Record<FormAuditAction, string> = {
  field_change: "Field Change",
  form_submit: "Form Submitted",
  form_submit_failed: "Submit Failed",
  form_reset: "Form Reset",
};

/** Provenance of the recorded IP fields. */
export type FormAuditIpSource = "server" | "unavailable";

/** Server-side IP stamp returned by `GET /api/audit/client-ip`. */
export interface ClientIpContext {
  ipAddress: string | null;
  ipHash: string | null;
  ipSource: FormAuditIpSource;
}

/**
 * A single immutable form audit entry.
 *
 * - `id`            – generated at write time.
 * - `formId`        – stable id of the form (matches the `<form id>` in the DOM).
 * - `formType`      – logical form name (e.g. "project-create").
 * - `actor`         – user identity: Stellar G… key, OAuth subject, or "anonymous".
 * - `action`        – one of the fixed FormAuditAction values.
 * - `field`         – form field name, present on `field_change` entries.
 * - `previousValue` / `value` – values before and after a change (length-capped).
 * - `timestamp`     – ISO 8601 string; set at write time and never altered.
 * - `ipAddress`     – client IP stamped server-side (null until/unless resolved).
 * - `ipHash`        – non-reversible hash of `ipAddress` for correlation.
 * - `ipSource`      – provenance of the IP fields.
 * - `metadata`      – optional key/value bag for extra context.
 */
export interface FormAuditLogEntry {
  id: string;
  formId: string;
  formType: string;
  actor: string;
  action: FormAuditAction;
  field?: string;
  previousValue?: string;
  value?: string;
  timestamp: string;
  ipAddress: string | null;
  ipHash: string | null;
  ipSource: FormAuditIpSource;
  metadata?: Record<string, string | number | boolean>;
}

/** Parameters accepted by `formAuditLogService.record()`. */
export interface AppendFormAuditLogParams {
  formId: string;
  formType: string;
  actor: string;
  action: FormAuditAction;
  field?: string;
  previousValue?: string;
  value?: string;
  ipAddress?: string | null;
  ipHash?: string | null;
  ipSource?: FormAuditIpSource;
  metadata?: Record<string, string | number | boolean>;
}

/** Filter options for `formAuditLogService.list()` / `search()`. */
export interface FormAuditLogFilter {
  formId?: string;
  formType?: string;
  actor?: string;
  action?: FormAuditAction;
  /** ISO 8601 – return entries on or after this date. */
  since?: string;
  /** ISO 8601 – return entries on or before this date. */
  until?: string;
  /** Case-insensitive free-text query across id, form, actor, field, action and IP. */
  query?: string;
  /** Maximum number of (newest-first) entries to return. */
  limit?: number;
}
