/**
 * POST /api/auth/refresh
 *
 * Exchanges a refresh token cookie for a new short-lived access token cookie
 * and a rotated refresh token cookie (token rotation prevents replay).
 *
 * Suspicious activity (IP change) causes session revocation and returns 401
 * so the client auto-logs out.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  setSessionCookie,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  clearSessionCookie,
  readRefreshTokenCookie,
} from "@/lib/auth/session";
import {
  rotateRefreshToken,
  revokeSession,
  getSessionById,
} from "@/lib/auth/device-sessions";
import { getUser } from "@/lib/auth/users";
import { extractClientIP } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const refreshToken = await readRefreshTokenCookie();
  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  const ip = extractClientIP(request);
  const result = await rotateRefreshToken(refreshToken, ip);

  if (!result) {
    await clearRefreshTokenCookie();
    await clearSessionCookie();
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  if (result.suspicious) {
    const session = await getSessionById(result.sessionId);
    if (session) {
      await revokeSession(result.sessionId, session.userId);
    }
    await clearRefreshTokenCookie();
    await clearSessionCookie();
    console.warn(`[session] Suspicious IP change — revoked session ${result.sessionId}`);
    return NextResponse.json({ error: "Suspicious activity detected" }, { status: 401 });
  }

  const session = await getSessionById(result.sessionId);
  if (!session) {
    await clearRefreshTokenCookie();
    await clearSessionCookie();
    return NextResponse.json({ error: "Session not found" }, { status: 401 });
  }

  const user = getUser(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const accessToken = await createSessionToken(user, result.sessionId);
  await setSessionCookie(accessToken);
  await setRefreshTokenCookie(result.refreshToken);

  return NextResponse.json({ ok: true });
}
