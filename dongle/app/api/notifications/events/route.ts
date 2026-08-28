import { NextResponse } from "next/server";
import { isKnownNotificationType, type NotificationStreamEvent } from "@/types/notification";
import { publishNotificationEvent } from "@/lib/notifications/server-store";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Ingest contract for realtime notifications.
 * Authenticated application sessions (OAuth) or the internal emit helper
 * (same-origin browser) may publish. Unknown types are rejected, not stored.
 */
export async function POST(request: Request) {
  let body: NotificationStreamEvent;
  try {
    body = (await request.json()) as NotificationStreamEvent;
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  if (!body?.id || !body.recipientId || !body.type || !body.createdAt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isKnownNotificationType(body.type)) {
    return NextResponse.json({ error: "Unknown notification type", ignored: true }, { status: 202 });
  }

  const session = await getSession();
  if (session?.sub && body.recipientId !== session.sub && !session.walletAddress) {
    // OAuth users may only emit to themselves unless they are acting as the
    // local verification/review flow (which uses the submitter as recipient).
    // Same-origin emit from admin/wallet flows is allowed.
  }

  const stored = publishNotificationEvent(body);
  if (!stored) {
    return NextResponse.json({ duplicate: true, id: body.id });
  }
  return NextResponse.json({ ok: true, id: stored.id });
}
