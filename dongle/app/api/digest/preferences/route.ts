/**
 * GET  /api/digest/preferences  — fetch current digest preferences
 * PATCH /api/digest/preferences  — upsert digest preferences
 * DELETE /api/digest/preferences — delete / opt out
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { RECIPIENT_COOKIE } from "@/lib/notifications/constants";
import {
  getDigestPreferences,
  upsertDigestPreferences,
  deleteDigestPreferences,
} from "@/lib/digest/preferences.store";
import type { DigestPreferencesInput } from "@/types/digest";

export const dynamic = "force-dynamic";

async function resolveRecipient(): Promise<string | null> {
  const session = await getSession();
  if (session?.sub) return session.sub;
  const jar = await cookies();
  return jar.get(RECIPIENT_COOKIE)?.value ?? null;
}

export async function GET() {
  const recipientId = await resolveRecipient();
  if (!recipientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = getDigestPreferences(recipientId);

  if (!prefs) {
    // Return sensible defaults when no preference is set yet
    return NextResponse.json({
      preferences: null,
      defaults: { frequency: "never", timezone: "UTC" },
    });
  }

  // Strip the internal unsubscribe token from the client response
  const { unsubscribeToken: _token, ...safePrefs } = prefs;
  return NextResponse.json({ preferences: safePrefs });
}

export async function PATCH(request: NextRequest) {
  const recipientId = await resolveRecipient();
  if (!recipientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<DigestPreferencesInput>;
  try {
    body = (await request.json()) as Partial<DigestPreferencesInput>;
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  if (!body.email || !body.frequency) {
    return NextResponse.json(
      { error: "email and frequency are required" },
      { status: 400 },
    );
  }

  const result = upsertDigestPreferences(recipientId, {
    email: body.email,
    frequency: body.frequency,
    timezone: body.timezone,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { unsubscribeToken: _token, ...safePrefs } = result.prefs!;
  return NextResponse.json({
    preferences: safePrefs,
    message: "Digest preferences updated",
  });
}

export async function DELETE() {
  const recipientId = await resolveRecipient();
  if (!recipientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  deleteDigestPreferences(recipientId);
  return NextResponse.json({ message: "Digest preferences removed" });
}
