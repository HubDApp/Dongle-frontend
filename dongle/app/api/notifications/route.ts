import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
} from "@/lib/notifications/server-store";
import { RECIPIENT_COOKIE } from "@/lib/notifications/constants";

export const dynamic = "force-dynamic";

export async function resolveRecipient(): Promise<string | null> {
  const session = await getSession();
  if (session?.sub) return session.sub;
  const jar = await cookies();
  return jar.get(RECIPIENT_COOKIE)?.value ?? null;
}

export async function GET() {
  const recipient = await resolveRecipient();
  if (!recipient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = listNotifications(recipient);
  return NextResponse.json({
    items,
    unread: Math.max(0, unreadCount(recipient)),
  });
}

export async function PATCH(request: Request) {
  const recipient = await resolveRecipient();
  if (!recipient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { id?: string; all?: boolean };
  if (body.all) {
    markAllNotificationsRead(recipient);
  } else if (body.id) {
    markNotificationRead(recipient, body.id);
  }
  return NextResponse.json({
    items: listNotifications(recipient),
    unread: Math.max(0, unreadCount(recipient)),
  });
}

export { RECIPIENT_COOKIE } from "@/lib/notifications/constants";
