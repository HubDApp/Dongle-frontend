import { NextRequest, NextResponse } from "next/server";
import {
  getWebhook,
  updateWebhook,
  deleteWebhook,
  listDeliveries,
} from "@/services/webhook/webhook.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

/**
 * GET /api/webhooks/[id]
 * PATCH /api/webhooks/[id]
 * DELETE /api/webhooks/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const webhook = getWebhook(params.id);
    if (!webhook) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Webhook not found", 404),
        { status: 404 },
      );
    }
    const { secret, ...safe } = webhook;
    return NextResponse.json(createSuccessResponse(safe));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to get webhook", 500),
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const webhook = updateWebhook(params.id, body);
    if (!webhook) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Webhook not found", 404),
        { status: 404 },
      );
    }
    const { secret, ...safe } = webhook;
    return NextResponse.json(createSuccessResponse(safe));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        error instanceof Error ? error.message : "Update failed",
        400,
      ),
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const removed = deleteWebhook(params.id);
    if (!removed) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, "Webhook not found", 404),
        { status: 404 },
      );
    }
    return NextResponse.json(createSuccessResponse({ deleted: true }));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Delete failed", 500),
      { status: 500 },
    );
  }
}

/**
 * GET /api/webhooks/deliveries
 * Webhook delivery logs.
 */
export async function GET_DELIVERIES(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || "50");
    return NextResponse.json(createSuccessResponse(listDeliveries(limit)));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to list deliveries", 500),
      { status: 500 },
    );
  }
}
