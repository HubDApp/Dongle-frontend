/**
 * Webhook sending API with signature and retry support
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSignature } from "@/lib/webhook-signature";
import {
  scheduleWebhookDelivery,
  DEFAULT_RETRY_CONFIG,
} from "@/services/webhook/webhook-retry.service";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";
import type { WebhookPayload, WebhookDelivery } from "@/types/webhook";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "default-webhook-secret-change-in-production";

/**
 * POST /api/webhooks/send
 * Send a signed webhook with retry logic
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, event, data } = body;

    // Validate request
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Valid webhook URL is required",
          400
        ),
        { status: 400 }
      );
    }

    if (!event || typeof event !== "string") {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Event name is required",
          400
        ),
        { status: 400 }
      );
    }

    // Create webhook payload
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data: data || {},
      id: crypto.randomUUID(),
    };

    // Generate signature
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString, WEBHOOK_SECRET);

    // Create delivery object
    const delivery: WebhookDelivery = {
      id: crypto.randomUUID(),
      url,
      payload,
      signature,
      attempt: 0,
      maxAttempts: body.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Schedule delivery with retry
    await scheduleWebhookDelivery(delivery);

    return NextResponse.json(
      createSuccessResponse({
        deliveryId: delivery.id,
        webhookId: payload.id,
        status: "scheduled",
        url,
      }),
      { status: 202 }
    );
  } catch (error) {
    console.error("[Webhook Send] Error:", error);
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to send webhook",
        500
      ),
      { status: 500 }
    );
  }
}
