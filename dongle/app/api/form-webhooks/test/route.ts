/**
 * POST /api/form-webhooks/test
 * Send a test webhook to verify URL + signature configuration.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sendTestWebhook } from "@/services/form-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await sendTestWebhook({
      url: body?.url,
      secret: body?.secret,
      formType: body?.formType,
    });

    const status = result.status === "failed" ? 502 : 200;
    return NextResponse.json({ result }, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Test webhook failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "POST to this endpoint with optional { url, secret, formType } to send a test webhook.",
  });
}
