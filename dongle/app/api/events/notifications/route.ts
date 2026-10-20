import { NextResponse } from "next/server";
import { publishNotificationEvent } from "@/lib/notifications/server-store";
import { isKnownNotificationType, type NotificationStreamEvent } from "@/types/notification";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = process.env.INDEXER_NOTIFICATION_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: NotificationStreamEvent;
  try {
    event = await request.json() as NotificationStreamEvent;
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }
  if (!event.id || !event.recipientId || !event.createdAt || !isKnownNotificationType(event.type)) {
    return NextResponse.json({ error: "Invalid notification event" }, { status: 400 });
  }

  const stored = publishNotificationEvent(event);
  if (!stored) return NextResponse.json({ duplicate: true, id: event.id });
  return NextResponse.json({ ok: true, id: stored.id });
}