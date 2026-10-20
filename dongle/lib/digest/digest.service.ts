/**
 * Email digest service.
 *
 * Queries unread notifications for a recipient, builds the email, and sends it
 * via the existing email service (SendGrid / Mailgun).
 *
 * Called by:
 *   - /api/cron/digest   (scheduled — processes all due subscribers)
 *   - /api/digest/send   (manual test-send for a single recipient)
 */

import { sendEmail } from "@/lib/email/email-service";
import {
  renderDigestHtml,
  renderDigestText,
  renderDigestSubject,
} from "@/lib/email/digest-template";
import {
  getDigestPreferences,
  getDueSubscribers,
  updateLastSentAt,
} from "@/lib/digest/preferences.store";
import { listNotifications } from "@/lib/notifications/server-store";
import type { DigestSendResult } from "@/types/digest";
import type { AppNotification } from "@/types/notification";

const MAX_TOP_NOTIFICATIONS = 5;

function appBaseUrl(): string {
  return (
    process.env.AUTH_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

// ── Single recipient ───────────────────────────────────────────────────────────

/**
 * Send a digest to one recipient.
 * Pass `force: true` to skip the "is it due?" check (used for test sends).
 */
export async function sendDigestToRecipient(
  recipientId: string,
  options: { force?: boolean } = {},
): Promise<DigestSendResult> {
  const prefs = getDigestPreferences(recipientId);

  if (!prefs) {
    return {
      recipientId,
      email: "",
      notificationCount: 0,
      sent: false,
      skipped: true,
      skipReason: "never",
      error: "No digest preferences found",
    };
  }

  if (prefs.frequency === "never" && !options.force) {
    return {
      recipientId,
      email: prefs.email,
      notificationCount: 0,
      sent: false,
      skipped: true,
      skipReason: "never",
    };
  }

  // Fetch unread notifications for this recipient
  const all: AppNotification[] = listNotifications(recipientId);
  const unread = all.filter((n) => !n.read);
  const unreadCount = unread.length;

  // Don't send an empty digest (unless test-forced)
  if (unreadCount === 0 && !options.force) {
    return {
      recipientId,
      email: prefs.email,
      notificationCount: 0,
      sent: false,
      skipped: true,
      skipReason: "no_unread",
    };
  }

  const topNotifications = unread.slice(0, MAX_TOP_NOTIFICATIONS);
  const generatedAt = new Date().toISOString();

  const templateData = {
    recipientId,
    frequency: prefs.frequency,
    unreadCount,
    topNotifications,
    appBaseUrl: appBaseUrl(),
    unsubscribeToken: prefs.unsubscribeToken,
    generatedAt,
  };

  const subject = renderDigestSubject(prefs.frequency, unreadCount);
  const html = renderDigestHtml(templateData);
  const text = renderDigestText(templateData);

  const result = await sendEmail({ to: prefs.email, subject, html, text });

  if (result.success) {
    updateLastSentAt(recipientId, generatedAt);
    console.log(`[digest] Sent to ${prefs.email} (${unreadCount} unread)`);
    return {
      recipientId,
      email: prefs.email,
      notificationCount: unreadCount,
      sent: true,
      skipped: false,
      messageId: result.messageId,
    };
  }

  console.error(`[digest] Failed to send to ${prefs.email}: ${result.error}`);
  return {
    recipientId,
    email: prefs.email,
    notificationCount: unreadCount,
    sent: false,
    skipped: false,
    error: result.error,
  };
}

// ── Batch (cron) ───────────────────────────────────────────────────────────────

export interface BatchDigestResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  results: DigestSendResult[];
  durationMs: number;
}

/**
 * Process all subscribers whose digest is due right now.
 * Called by the /api/cron/digest cron handler.
 */
export async function runDigestBatch(referenceMs?: number): Promise<BatchDigestResult> {
  const startMs = Date.now();
  const dueSubscribers = getDueSubscribers(referenceMs);

  console.log(`[digest-cron] ${dueSubscribers.length} subscriber(s) due for digest`);

  const results = await Promise.allSettled(
    dueSubscribers.map((prefs) => sendDigestToRecipient(prefs.recipientId)),
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const digestResults: DigestSendResult[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") {
      digestResults.push(r.value);
      if (r.value.sent) sent++;
      else if (r.value.skipped) skipped++;
      else failed++;
    } else {
      failed++;
      console.error("[digest-cron] Unexpected error:", r.reason);
    }
  }

  const durationMs = Date.now() - startMs;
  console.log(
    `[digest-cron] Done in ${durationMs}ms — sent:${sent} skipped:${skipped} failed:${failed}`,
  );

  return {
    processed: dueSubscribers.length,
    sent,
    skipped,
    failed,
    results: digestResults,
    durationMs,
  };
}
