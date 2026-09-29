/**
 * POST /api/form-email/confirm
 * Send a form submission confirmation email.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  sendFormConfirmationEmail,
  type FormEmailConfirmationRequest,
} from "@/services/form-email-confirmation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FormEmailConfirmationRequest;

    if (!body?.to || !body?.submissionId || !body?.formType || !body?.formTitle) {
      return NextResponse.json(
        { error: "to, submissionId, formType, and formTitle are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.summary)) {
      return NextResponse.json({ error: "summary must be an array" }, { status: 400 });
    }

    const result = await sendFormConfirmationEmail(body);
    const status = result.status === "failed" ? 502 : 200;
    return NextResponse.json({ result }, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to send confirmation email",
      },
      { status: 500 },
    );
  }
}
