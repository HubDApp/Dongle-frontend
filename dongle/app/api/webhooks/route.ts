import { NextRequest, NextResponse } from "next/server";
import {
  createWebhook,
  listWebhooks,
  type WebhookConfig,
} from "@/services/webhook/webhook.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

/**
 * GET /api/webhooks
 * Query: ?projectId=...
 * List webhook configs.
 *
 * POST /api/webhooks
 * Body: { projectId, url, events[], secret?, active? }
 * Create a webhook config (HTTPS only).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const configs = listWebhooks(projectId).map(({ secret, ...rest }) => rest);
    return NextResponse.json(createSuccessResponse(configs));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to list webhooks", 500),
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, url, events, secret, active } = body;

    if (!projectId || !url || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "projectId, url and events are required",
          400,
        ),
        { status: 400 },
      );
    }

    const webhook = createWebhook({ projectId, url, events, secret, active });
    const { secret: _, ...safe } = webhook;
    return NextResponse.json(createSuccessResponse(safe), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        error instanceof Error ? error.message : "Invalid webhook",
        400,
      ),
      { status: 400 },
    );
  }
}
