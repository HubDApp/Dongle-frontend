/**
 * Typed analytics event catalog for Dongle core user journeys.
 * See ANALYTICS_TRACKING_PLAN.md for the full tracking plan.
 */

/** Allowed event names — keep in sync with the tracking plan. */
export type AnalyticsEventName =
  | "page_view"
  | "wallet_connect"
  | "wallet_disconnect"
  | "wallet_connect_failed"
  | "project_view"
  | "search"
  | "filter"
  | "project_submit"
  | "project_submit_failed"
  | "verification_request"
  | "verification_request_failed"
  | "review_submit"
  | "review_update"
  | "review_submit_failed"
  | "form_submit"
  | "form_submit_success"
  | "form_submit_error"
  | "form_field_change"
  | "form_abandon"
  | "form_backup_created"
  | "form_backup_restored"
  | "form_backup_failed"
  | "form_backup_retention_cleaned"
  | "form_archive_created"
  | "form_archive_restored"
  | "form_archive_search"
  | "form_archive_deleted"
  | "form_archive_retention_cleaned"
  | "consent_given"
  | "consent_withdrawn"
  | "data_export"
  | "data_deletion_requested"
  | "data_deletion_completed";

/** Flat property bag — values must be JSON-serializable primitives. */
export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties?: AnalyticsProperties;
  /** ISO-8601 timestamp assigned by the client at emit time. */
  timestamp: string;
  /** Opaque session id (not tied to a wallet). */
  sessionId: string;
}

export interface AnalyticsTransport {
  send(event: AnalyticsEvent): void;
}
