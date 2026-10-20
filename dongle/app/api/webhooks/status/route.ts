/**
 * Webhook monitoring and status dashboard API
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDeliveryStatus,
  getPendingDeliveries,
  getDeadLetterQueue,
  getRetryStatistics,
  retryFromDeadLetterQueue,
} from "@/services/webhook/webhook-retry.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

/**
 * GET /api/webhooks/status
 * Get webhook delivery status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = searchParams.get("deliveryId");

    // Get specific delivery status
    if (deliveryId) {
      const delivery = getDeliveryStatus(deliveryId);
      
      if (!delivery) {
        return NextResponse.json(
          createErrorResponse(
            ErrorCode.NOT_FOUND,
            `Delivery ${deliveryId} not found`,
            404
          ),
          { status: 404 }
        );
      }

      return NextResponse.json(createSuccessResponse(delivery), { status: 200 });
    }

    // Get overall statistics
    const stats = getRetryStatistics();
    const pending = getPendingDeliveries();
    const dlq = getDeadLetterQueue();

    const dashboard = {
      statistics: stats,
      pending: pending.map((d) => ({
        id: d.id,
        url: d.url,
        attempt: d.attempt,
        maxAttempts: d.maxAttempts,
        status: d.status,
        nextRetryAt: d.nextRetryAt,
        createdAt: d.createdAt,
      })),
      deadLetterQueue: dlq.map((item) => ({
        id: item.delivery.id,
        url: item.delivery.url,
        failedAt: item.failedAt,
        reason: item.reason,
        attempts: item.delivery.attempt,
      })),
    };

    return NextResponse.json(createSuccessResponse(dashboard), { status: 200 });
  } catch (error) {
    console.error("[Webhook Status] Error:", error);
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to fetch webhook status",
        500
      ),
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks/status
 * Retry delivery from dead letter queue
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deliveryId, action } = body;

    if (!deliveryId || typeof deliveryId !== "string") {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Delivery ID is required",
          400
        ),
        { status: 400 }
      );
    }

    if (action === "retry") {
      const retried = await retryFromDeadLetterQueue(deliveryId);

      if (!retried) {
        return NextResponse.json(
          createErrorResponse(
            ErrorCode.NOT_FOUND,
            `Delivery ${deliveryId} not found in dead letter queue`,
            404
          ),
          { status: 404 }
        );
      }

      return NextResponse.json(
        createSuccessResponse({
          deliveryId,
          status: "retrying",
          message: "Delivery moved back to queue for retry",
        }),
        { status: 200 }
      );
    }

    return NextResponse.json(
      createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        "Invalid action. Supported actions: retry",
        400
      ),
      { status: 400 }
    );
  } catch (error) {
    console.error("[Webhook Status] Error:", error);
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to process webhook action",
        500
      ),
      { status: 500 }
    );
  }
}
