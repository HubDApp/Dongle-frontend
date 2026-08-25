import { NextResponse } from "next/server";
import {
  getAdminTokenFromCookie,
  refreshAdminToken,
  setAdminTokenCookie,
  clearAdminTokenCookie,
} from "@/lib/admin-auth";

export async function POST() {
  try {
    const existingToken = await getAdminTokenFromCookie();

    if (!existingToken) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    const newToken = await refreshAdminToken(existingToken);

    if (!newToken) {
      await clearAdminTokenCookie();
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    await setAdminTokenCookie(newToken);

    return NextResponse.json({
      success: true,
      expiresInSeconds: 900,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
