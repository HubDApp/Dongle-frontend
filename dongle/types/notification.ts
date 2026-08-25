/**
 * In-app notification types for the Dongle frontend.
 *
 * Notifications are scoped to a recipient wallet address and stored in
 * localStorage (same pattern as other services).  They are currently
 * read-only once written — only the claim flow creates them.
 */

export type NotificationType =
  | "claim_received"   // claimant receives this after submitting
  | "claim_approved"   // claimant receives this after admin approves
  | "claim_rejected";  // claimant receives this after admin rejects

export interface AppNotification {
  id: string;
  /** Stellar G… address of the recipient wallet. */
  recipientAddress: string;
  type: NotificationType;
  /** Short subject line shown in the banner. */
  title: string;
  /** Optional longer body text (e.g. rejection reason). */
  message?: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** Whether the user has dismissed/read this notification. */
  read: boolean;
  /** The claim request ID this notification is about. */
  claimRequestId: string;
  /** The project ID this notification is about. */
  projectId: string;
  /** Human-readable project name at time of notification. */
  projectName: string;
}

export interface CreateNotificationParams {
  recipientAddress: string;
  type: NotificationType;
  title: string;
  message?: string;
  claimRequestId: string;
  projectId: string;
  projectName: string;
}
