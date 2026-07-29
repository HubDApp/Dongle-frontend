/**
 * Audit Log Types
 *
 * Every admin mutation must produce an AuditLogEntry so that all admin actions
 * are traceable, immutable from the regular UI, and visible in the Audit Log tab.
 */

/** The set of admin actions that are recorded. */
export type AuditAction =
  | "verification_approved"
  | "verification_rejected"
  | "fee_updated"
  | "report_resolved"
  | "report_dismissed";

/** Human-readable labels for each action. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  verification_approved: "Verification Approved",
  verification_rejected: "Verification Rejected",
  fee_updated: "Fee Updated",
  report_resolved: "Report Resolved",
  report_dismissed: "Report Dismissed",
};

/**
 * A single immutable audit log entry.
 *
 * - `actor`     – Stellar G… public key of the admin who performed the action.
 * - `action`    – One of the fixed AuditAction values.
 * - `targetId`  – Identifier of the entity that was acted on (request ID, report ID, …).
 * - `targetLabel` – Human-readable name/label for the target (project name, etc.).
 * - `timestamp` – ISO 8601 string; set at write time and never altered.
 * - `reason`    – Optional free-text reason the admin supplied.
 * - `metadata`  – Optional key/value bag for additional context (old value, new value, …).
 */
export interface AuditLogEntry {
  id: string;
  actor: string;
  action: AuditAction;
  targetId: string;
  targetLabel: string;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean>;
}

/** Parameters accepted by auditLogService.append(). */
export interface AppendAuditLogParams {
  actor: string;
  action: AuditAction;
  targetId: string;
  targetLabel: string;
  reason?: string;
  metadata?: Record<string, string | number | boolean>;
}

/** Filter options for auditLogService.list(). */
export interface AuditLogFilter {
  actor?: string;
  action?: AuditAction;
  since?: string; // ISO 8601 – return entries on or after this date
  until?: string; // ISO 8601 – return entries on or before this date
}
