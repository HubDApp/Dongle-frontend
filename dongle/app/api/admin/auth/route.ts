import { NextResponse } from "next/server";
import { isAdminAllowed, createAdminToken, setAdminTokenCookie } from "@/lib/admin-auth";
import { ADMIN_TOKEN_MAX_AGE_SECONDS } from "@/constants/timeouts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { publicKey } = body as { publicKey?: string };

    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json({ error: "Missing publicKey" }, { status: 400 });
    }

    // Validate Stellar public key format (G... base32, 56 chars)
    if (!/^G[A-Z2-7]{55}$/.test(publicKey)) {
      return NextResponse.json({ error: "Invalid public key format" }, { status: 400 });
    }

    // Check server-side allowlist (never exposed to client bundle)
    if (!isAdminAllowed(publicKey)) {
      console.warn(
        `[admin-access] DENIED login for ${publicKey.slice(0, 8)}...${publicKey.slice(-4)} at ${new Date().toISOString()}`,
      );
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const token = await createAdminToken(publicKey);
    await setAdminTokenCookie(token);

    console.log(
      `[admin-access] GRANTED login for ${publicKey.slice(0, 8)}...${publicKey.slice(-4)} at ${new Date().toISOString()}`,
    );

    return NextResponse.json({
      success: true,
      expiresInSeconds: ADMIN_TOKEN_MAX_AGE_SECONDS,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
