/**
 * GET  /api/auth/sessions  — list active sessions for the current user
 * DELETE /api/auth/sessions — revoke all sessions except the current one
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSessionViews, revokeAllSessions } from "@/lib/auth/device-sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await getSessionViews(session.sub, session.sessionId);
  return NextResponse.json({ sessions });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await revokeAllSessions(session.sub, session.sessionId);
  return NextResponse.json({ revoked: count });
}
