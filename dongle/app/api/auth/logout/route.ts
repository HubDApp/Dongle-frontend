import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
} from "@/lib/auth/session";
import { rotateRefreshToken, revokeSession, getSessionById } from "@/lib/auth/device-sessions";

export const dynamic = "force-dynamic";

export async function POST() {
  // Revoke the device session associated with this refresh token
  const refreshToken = await readRefreshTokenCookie();
  if (refreshToken) {
    // We can't rotate (that would update lastActive), so look up by token then revoke
    // The rotate function accepts any IP — use empty string here since we're revoking
    const result = await rotateRefreshToken(refreshToken, "logout");
    if (result) {
      const session = await getSessionById(result.sessionId);
      if (session) {
        await revokeSession(result.sessionId, session.userId);
      }
    }
  }

  await clearSessionCookie();
  await clearRefreshTokenCookie();
  return NextResponse.json({ ok: true });
}
