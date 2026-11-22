import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { RECIPIENT_COOKIE } from "@/lib/notifications/constants";
import {
  getServerNotificationPreferences,
  setServerNotificationPreferences,
  type ServerNotificationPreferences,
} from "@/lib/notifications/preferences-store";

export const dynamic = "force-dynamic";

async function resolveRecipient(
  fallback?: string | null,
): Promise<string | null> {
  const session = await getSession();
  if (session?.sub) return session.sub;

  const jar = await cookies();
  const cookieRecipient = jar.get(RECIPIENT_COOKIE)?.value;
  if (cookieRecipient) return cookieRecipient;

  return fallback || null;
}

export async function GET(request: NextRequest) {
  const recipientId = await resolveRecipient(
    request.nextUrl.searchParams.get("recipientId"),
  );
  if (!recipientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    preferences: getServerNotificationPreferences(recipientId),
  });
}

export async function PATCH(request: NextRequest) {
  let body: {
    recipientId?: string;
    preferences?: Partial<ServerNotificationPreferences>;
    enabled?: boolean;
    events?: Partial<ServerNotificationPreferences["events"]>;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const recipientId = await resolveRecipient(body.recipientId);
  if (!recipientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = body.preferences ?? {
    enabled: body.enabled,
    events: body.events,
  };

  const preferences = setServerNotificationPreferences(recipientId, input);

  return NextResponse.json({
    preferences,
    message: "Preferences updated successfully",
  });
}
