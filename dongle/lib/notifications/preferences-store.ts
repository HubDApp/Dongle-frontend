/**
 * Server-side notification event preferences.
 *
 * The settings page writes these through /api/notifications/preferences so the
 * notification emitter can drop disabled event types before they are stored or
 * streamed. Defaults are all-enabled for recipients without a saved preference.
 */

import type { NotificationType } from "@/types/notification";

export const NOTIFICATION_EVENT_PREFERENCES = [
  "projectVerifiedRejected",
  "reviewApprovedRejected",
  "verificationEvidenceRequested",
  "claimStatusChanges",
  "projectUpdates",
  "reviewComments",
  "reviewMentions",
  "verificationStatus",
  "newFollowers",
  "weeklyDigest",
] as const;

export type NotificationEventPreference =
  (typeof NOTIFICATION_EVENT_PREFERENCES)[number];

export type NotificationEventPreferences = Record<
  NotificationEventPreference,
  boolean
>;

export interface ServerNotificationPreferences {
  enabled: boolean;
  events: NotificationEventPreferences;
}

const DEFAULT_EVENTS = Object.fromEntries(
  NOTIFICATION_EVENT_PREFERENCES.map((key) => [key, true] as const),
) as NotificationEventPreferences;

const DEFAULT_PREFERENCES: ServerNotificationPreferences = {
  enabled: true,
  events: DEFAULT_EVENTS,
};

const store = new Map<string, ServerNotificationPreferences>();

/** Maps wire event types onto the toggle that controls them. */
const EVENT_PREFERENCE_BY_TYPE: Partial<
  Record<NotificationType, NotificationEventPreference>
> = {
  project_verified: "projectVerifiedRejected",
  project_rejected: "projectVerifiedRejected",
  project_verification_changed: "projectVerifiedRejected",
  review_approved: "reviewApprovedRejected",
  review_rejected: "reviewApprovedRejected",
  verification_evidence_requested: "verificationEvidenceRequested",
  claim_received: "claimStatusChanges",
  claim_approved: "claimStatusChanges",
  claim_rejected: "claimStatusChanges",
  project_update: "projectUpdates",
  project_update_posted: "projectUpdates",
  submission_comment: "reviewComments",
  review_owner_response: "reviewComments",
  submission_mention: "reviewMentions",
};

export function getServerNotificationPreferences(
  recipientId: string,
): ServerNotificationPreferences {
  return store.get(recipientId) ?? DEFAULT_PREFERENCES;
}

export function setServerNotificationPreferences(
  recipientId: string,
  input: Partial<ServerNotificationPreferences>,
): ServerNotificationPreferences {
  const current = getServerNotificationPreferences(recipientId);
  const events = { ...current.events };

  for (const key of NOTIFICATION_EVENT_PREFERENCES) {
    const value = input.events?.[key];
    if (typeof value === "boolean") {
      events[key] = value;
    }
  }

  const next: ServerNotificationPreferences = {
    enabled:
      typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    events,
  };
  store.set(recipientId, next);
  return next;
}

export function isNotificationEnabled(
  recipientId: string,
  type: string,
): boolean {
  const preferences = getServerNotificationPreferences(recipientId);
  if (!preferences.enabled) return false;

  const key = EVENT_PREFERENCE_BY_TYPE[type as NotificationType];
  if (!key) return true;

  return preferences.events[key] !== false;
}

/** Test helper — not for production request handlers. */
export function resetNotificationPreferencesForTests(): void {
  store.clear();
}
