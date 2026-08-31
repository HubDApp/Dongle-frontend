/**
 * In-app notification types for the Dongle frontend.
 *
 * Real-time events arrive over SSE. History is capped at 50 per recipient.
 * Toast auto-dismiss is a presentation concern and must not delete history.
 */

export const REALTIME_NOTIFICATION_TYPES = [
  "project_verified",
  "project_rejected",
  "review_approved",
  "review_rejected",
  "verification_evidence_requested",
] as const;

export const LEGACY_NOTIFICATION_TYPES = [
  "claim_received",
  "claim_approved",
  "claim_rejected",
] as const;

export const NOTIFICATION_TYPES = [
  ...REALTIME_NOTIFICATION_TYPES,
  ...LEGACY_NOTIFICATION_TYPES,
] as const;

export type RealtimeNotificationType = (typeof REALTIME_NOTIFICATION_TYPES)[number];
export type LegacyNotificationType = (typeof LEGACY_NOTIFICATION_TYPES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_HISTORY_LIMIT = 50;
export const NOTIFICATION_TOAST_MS = 5000;

export function isKnownNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export interface AppNotification {
  id: string;
  /** Wallet address (G…) or OAuth subject used as the stream recipient. */
  recipientAddress: string;
  type: NotificationType;
  title: string;
  message?: string;
  createdAt: string;
  read: boolean;
  claimRequestId?: string;
  projectId?: string;
  projectName?: string;
  reviewId?: string;
  /** Provider event id used for deduplication when present. */
  eventId?: string;
}

export interface CreateNotificationParams {
  recipientAddress: string;
  type: NotificationType;
  title: string;
  message?: string;
  claimRequestId?: string;
  projectId?: string;
  projectName?: string;
  reviewId?: string;
  eventId?: string;
  id?: string;
  createdAt?: string;
}

export interface NotificationStreamEvent {
  id: string;
  type: string;
  recipientId: string;
  projectId?: string;
  projectName?: string;
  reviewId?: string;
  createdAt: string;
  messageKey?: string;
  messageParams?: Record<string, string>;
}
