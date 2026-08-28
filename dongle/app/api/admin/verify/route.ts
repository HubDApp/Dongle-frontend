import { NextResponse } from "next/server";
import {
  getAdminTokenFromCookie,
  verifyAdminToken,
  REFRESH_MARGIN_SECONDS,
  TOKEN_MAX_AGE_SECONDS,
} from "@/lib/admin-auth";

/**
 * GET /api/admin/verify
 *
 * Checks whether the current admin session is valid.
 * Returns the remaining time in seconds and whether a refresh is recommended.
 */
export async function GET() {
  try {
    const token = await getAdminTokenFromCookie();

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const payload = await verifyAdminToken(token);

    if (!payload || !payload.publicKey) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const expiresAt = payload.exp ?? 0;
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = Math.max(0, expiresAt - now);
    const shouldRefresh = remainingSeconds <= REFRESH_MARGIN_SECONDS;

    return NextResponse.json({
      valid: true,
      publicKey: payload.publicKey,
      remainingSeconds,
      shouldRefresh,
      maxAge: TOKEN_MAX_AGE_SECONDS,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
