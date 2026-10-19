/**
 * POST /api/digest/send
 *
 * Test-send a digest email to the authenticated user immediately,
 * bypassing the frequency/schedule check.
 *
 * Used by the "Send test email" button in /settings/notifications.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { RECIPIENT_COOKIE } from "@/lib/notifications/constants";
import { getDigestPreferences } from "@/lib/digest/preferences.store";
import { sendDigestToRecipient } from "@/lib/digest/digest.service";

export const dynamic = "force-dynamic";

async function resolveRecipient(): Promise<string | null> {
  const session = await getSession();
  if (session?.sub) return session.sub;
  const jar = await cookies();
  return jar.get(RECIPIENT_COOKIE)?.value ?? null;
}

export async function POST() {
  const recipientId = await resolveRecipient();
  if (!recipientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = getDigestPreferences(recipientId);
  if (!prefs) {
    return NextResponse.json(
      { error: "No digest preferences configured. Set an email and frequency first." },
      { status: 400 },
    );
  }

  if (!prefs.email) {
    return NextResponse.json(
      { error: "No email address set for this recipient." },
      { status: 400 },
    );
  }

  // force: true skips the "is it due?" and "no unread" checks
  const result = await sendDigestToRecipient(recipientId, { force: true });

  if (result.sent) {
    return NextResponse.json({
      message: `Test digest sent to ${result.email}`,
      notificationCount: result.notificationCount,
      messageId: result.messageId,
    });
  }

  return NextResponse.json(
    {
      error: result.error ?? "Failed to send test digest",
      skipped: result.skipped,
      skipReason: result.skipReason,
    },
    { status: 502 },
  );
}
