/**
 * POST /api/projects/claims/notify
 *
 * Sends an email notification to a claimant after their ownership claim has
 * been approved or rejected by an admin.
 *
 * The recipient's email address is resolved server-side from the digest
 * preference store (wallet address -> email). When no email is available or
 * the email service is not configured, the request succeeds as a no-op so the
 * caller's best-effort notification never surfaces an error to the user.
 */

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/email-service";
import { isEmailConfigured } from "@/lib/email/email-config";
import {
  generateClaimDecisionEmail,
  type ClaimDecision,
} from "@/lib/email/templates";
import { getDigestPreferences } from "@/lib/digest/preferences.store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ClaimNotifyBody {
  recipientAddress: string;
  projectId: string;
  projectName: string;
  decision: ClaimDecision;
  reviewNote?: string;
}

export async function POST(request: Request) {
  let body: Partial<ClaimNotifyBody>;
  try {
    body = (await request.json()) as Partial<ClaimNotifyBody>;
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const { recipientAddress, projectId, projectName, decision, reviewNote } = body;

  if (
    !recipientAddress ||
    !projectId ||
    projectId.length > 128 ||
    !projectName ||
    (decision !== "approved" && decision !== "rejected")
  ) {
    return NextResponse.json(
      {
        error:
          "Missing or invalid fields: recipientAddress, projectId, projectName, decision",
      },
      { status: 400 }
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({
      ok: true,
      sent: false,
      skipped: true,
      reason: "email_not_configured",
    });
  }

  const prefs = getDigestPreferences(recipientAddress);
  if (!prefs?.email) {
    return NextResponse.json({
      ok: true,
      sent: false,
      skipped: true,
      reason: "no_recipient_email",
    });
  }

  const template = generateClaimDecisionEmail({
    decision,
    projectId,
    projectName,
    reviewNote: reviewNote?.trim() || undefined,
  });

  const result = await sendEmail({
    to: prefs.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (!result.success) {
    return NextResponse.json(
      { ok: false, sent: false, error: result.error },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, sent: true, messageId: result.messageId });
}
