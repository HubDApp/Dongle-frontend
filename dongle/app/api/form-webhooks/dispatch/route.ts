/**
 * POST /api/form-webhooks/dispatch
 * Dispatch form submission data to configured webhooks.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  buildFormWebhookPayload,
  dispatchFormWebhooks,
} from "@/services/form-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formType, submissionId, data, metadata, endpoints } = body ?? {};

    if (!formType || !submissionId || !data || typeof data !== "object") {
      return NextResponse.json(
        { error: "formType, submissionId, and data are required" },
        { status: 400 },
      );
    }

    const payload = buildFormWebhookPayload({
      formType,
      submissionId,
      data,
      metadata,
    });

    const result = await dispatchFormWebhooks(payload, {
      endpoints,
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook dispatch failed",
      },
      { status: 500 },
    );
  }
}
