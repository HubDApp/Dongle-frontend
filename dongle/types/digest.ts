/**
 * Email digest types for the Dongle notification digest system.
 */

export type DigestFrequency = "daily" | "weekly" | "never";

export interface DigestPreferences {
  /** Wallet address or OAuth subject — the recipient identity */
  recipientId: string;
  /** Destination email address */
  email: string;
  /** How often to send the digest */
  frequency: DigestFrequency;
  /**
   * IANA timezone name used to calculate 9 AM send time.
   * e.g. "America/New_York", "Europe/London", "Asia/Tokyo"
   * Falls back to "UTC" if not set or invalid.
   */
  timezone: string;
  /** ISO timestamp of the last digest send. null = never sent */
  lastSentAt: string | null;
  /**
   * One-time token for unsubscribe links.
   * Rotated on each send and on explicit unsubscribe.
   */
  unsubscribeToken: string;
  /** ISO timestamp of record creation */
  createdAt: string;
  /** ISO timestamp of last preference update */
  updatedAt: string;
}

export interface DigestPreferencesInput {
  email: string;
  frequency: DigestFrequency;
  timezone?: string;
}

export interface DigestSendResult {
  recipientId: string;
  email: string;
  notificationCount: number;
  sent: boolean;
  skipped: boolean;
  skipReason?: "no_unread" | "frequency_not_due" | "never" | "email_error";
  messageId?: string;
  error?: string;
}
