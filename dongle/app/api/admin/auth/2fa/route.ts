/**
 * POST /api/admin/auth/2fa
 *
 * Second step of admin login (Issue #728). Accepts a pending-2FA token from the
 * login response plus a verification `code` and/or `method`, and — on success —
 * issues the full admin session cookie.
 */

import { NextResponse } from "next/server";
import {
  createAdminToken,
  setAdminTokenCookie,
  verifyPending2FAToken,
  isAdminAllowed,
} from "@/lib/admin-auth";
import { adminTwoFAService } from "@/services/admin-twofa";
import { ADMIN_TOKEN_MAX_AGE_SECONDS } from "@/constants/timeouts";

export const dynamic = "force-dynamic";

interface Body {
  pendingToken?: string;
  method?: "totp" | "sms" | "webauthn" | "backup_code";
  code?: string;
  /** Expected SMS code, echoed from the client's beginSms setup flow. */
  expectedCode?: string;
  credentialId?: string;
  signCount?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    if (!body.pendingToken) {
      return NextResponse.json({ error: "Missing pendingToken" }, { status: 400 });
    }

    const pending = await verifyPending2FAToken(body.pendingToken);
    if (!pending || !pending.publicKey) {
      return NextResponse.json(
        { error: "Pending authentication expired. Please sign in again." },
        { status: 401 },
      );
    }

    // Re-check the allowlist: the allowlist may have changed since step 1.
    if (!isAdminAllowed(pending.publicKey)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const publicKey = pending.publicKey;

    let verified = false;

    if (body.method === "totp" && body.code) {
      const result = await adminTwoFAService.verifyTotp(publicKey, body.code);
      verified = result.success;
    } else if (body.method === "sms" && body.code && body.expectedCode) {
      const result = await adminTwoFAService.confirmSmsSetup(
        publicKey,
        body.code,
        body.expectedCode,
      );
      verified = result.success;
    } else if (body.method === "webauthn" && body.credentialId) {
      const result = await adminTwoFAService.verifyWebAuthnAssertion(
        publicKey,
        body.credentialId,
        body.signCount ?? 0,
      );
      verified = result.success;
    } else if (body.code) {
      // Default: treat the code as a TOTP value, then as a backup code.
      const totpResult = await adminTwoFAService.verifyTotp(publicKey, body.code);
      if (totpResult.success) {
        verified = true;
      } else {
        const backupResult = await adminTwoFAService.verifyBackupCode(publicKey, body.code);
        verified = backupResult.success;
      }
    }

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 },
      );
    }

    const token = await createAdminToken(publicKey);
    await setAdminTokenCookie(token);

    console.log(
      `[admin-access] GRANTED 2FA login for ${publicKey.slice(0, 8)}...${publicKey.slice(-4)} at ${new Date().toISOString()}`,
    );

    return NextResponse.json({
      success: true,
      expiresInSeconds: ADMIN_TOKEN_MAX_AGE_SECONDS,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
