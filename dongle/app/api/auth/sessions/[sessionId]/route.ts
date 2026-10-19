/**
 * DELETE /api/auth/sessions/[sessionId] — revoke a specific session
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { revokeSession } from "@/lib/auth/device-sessions";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const authSession = await getSession();
  if (!authSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await context.params;
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const ok = await revokeSession(sessionId, authSession.sub);
  if (!ok) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
