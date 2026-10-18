import { NextRequest, NextResponse } from "next/server";
import { deliverEvent } from "@/services/webhook/webhook.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

/**
 * POST /api/webhooks/test
 * Body: { projectId, event, url?, data? }
 * Test webhook button: sends a sample payload to verify configuration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, event = "review.created", data } = body;

    if (!projectId) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, "projectId is required", 400),
        { status: 400 },
      );
    }

    const result = await deliverEvent(projectId, event as any, data || { test: true });
    return NextResponse.json(
      createSuccessResponse({ sent: result.sent, deliveries: result.deliveries.length }),
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Test webhook failed", 500),
      { status: 500 },
    );
  }
}
