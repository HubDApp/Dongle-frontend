/**
 * /api/admin/2fa
 *
 * Admin two-factor authentication management (Issue #728). Requires a valid
 * admin session (cookie). Actions are dispatched via the `action` field.
 *
 * GET                → current 2FA status (enabled, methods, remaining codes)
 * POST action=begin-totp        → { secret, uri }
 * POST action=confirm-totp      → { code } enable + return backup codes
 * POST action=begin-sms         → { phoneNumber } → { code, maskedPhoneNumber }
 * POST action=confirm-sms       → { code, expectedCode }
 * POST action=begin-webauthn    → { challenge }
 * POST action=register-webauthn → { credentialId, publicKey, label }
 * POST action=regenerate-backup → { backupCodes }
 * POST action=disable           → disable 2FA
 */

import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-guard";
import { adminTwoFAService } from "@/services/admin-twofa";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const config = await adminTwoFAService.getConfig(admin.publicKey);
  const methods = await adminTwoFAService.getEnabledMethods(admin.publicKey);
  const remaining = await adminTwoFAService.getRemainingBackupCodeCount(admin.publicKey);

  return NextResponse.json({
    enabled: config.enabled,
    methods,
    remainingBackupCodes: remaining,
    webauthnCredentials: config.webauthnCredentials.map((c) => ({
      credentialId: c.credentialId,
      label: c.label,
      registeredAt: c.registeredAt,
    })),
  });
}

interface Body {
  action?: string;
  code?: string;
  expectedCode?: string;
  phoneNumber?: string;
  credentialId?: string;
  publicKey?: string;
  label?: string;
}

export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pk = admin.publicKey;

  switch (body.action) {
    case "begin-totp": {
      const { secret, uri } = await adminTwoFAService.beginTotpSetup(pk);
      return NextResponse.json({ secret, uri });
    }

    case "confirm-totp": {
      if (!body.code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
      }
      const result = await adminTwoFAService.confirmTotpSetup(pk, body.code);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const config = await adminTwoFAService.getConfig(pk);
      // Surface the plaintext codes once, at enrolment time.
      const plaintext = await adminTwoFAService.regenerateBackupCodes(pk);
      return NextResponse.json({ success: true, backupCodes: plaintext, config: { enabled: config.enabled } });
    }

    case "begin-sms": {
      if (!body.phoneNumber) {
        return NextResponse.json({ error: "Missing phoneNumber" }, { status: 400 });
      }
      const { code, maskedPhoneNumber } = await adminTwoFAService.beginSmsSetup(
        pk,
        body.phoneNumber,
      );
      return NextResponse.json({ code, maskedPhoneNumber });
    }

    case "confirm-sms": {
      if (!body.code || !body.expectedCode) {
        return NextResponse.json(
          { error: "Missing code or expectedCode" },
          { status: 400 },
        );
      }
      const result = await adminTwoFAService.confirmSmsSetup(
        pk,
        body.code,
        body.expectedCode,
      );
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, backupCodes: await adminTwoFAService.regenerateBackupCodes(pk) });
    }

    case "begin-webauthn": {
      const challenge = await adminTwoFAService.beginWebAuthnRegistration(pk);
      return NextResponse.json({ challenge });
    }

    case "register-webauthn": {
      if (!body.credentialId || !body.publicKey) {
        return NextResponse.json(
          { error: "Missing credentialId or publicKey" },
          { status: 400 },
        );
      }
      await adminTwoFAService.registerWebAuthnCredential(pk, {
        credentialId: body.credentialId,
        publicKey: body.publicKey,
        label: body.label,
      });
      return NextResponse.json({ success: true });
    }

    case "regenerate-backup": {
      const backupCodes = await adminTwoFAService.regenerateBackupCodes(pk);
      return NextResponse.json({ backupCodes });
    }

    case "disable": {
      await adminTwoFAService.disable(pk);
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
