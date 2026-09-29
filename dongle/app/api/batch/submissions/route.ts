/**
 * Batch form submissions API endpoint
 * Supports both atomic and individual processing modes
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";
import type {
  BatchSubmissionRequest,
  BatchSubmissionResponse,
  BatchSubmissionResult,
} from "@/types/batch";

/**
 * Process individual item (replace with actual business logic)
 */
async function processItem<T>(item: { id: string; data: T }): Promise<{
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}> {
  try {
    // Simulate processing with validation
    if (!item.data || typeof item.data !== "object") {
      throw new Error("Invalid item data");
    }

    // Simulate async processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Example success response
    return {
      success: true,
      data: { id: item.id, processed: true, timestamp: new Date().toISOString() },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "PROCESSING_ERROR",
        message: error instanceof Error ? error.message : "Failed to process item",
      },
    };
  }
}

/**
 * POST /api/batch/submissions
 * Submit multiple forms in batch
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BatchSubmissionRequest;

    // Validate request
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "Items array is required and must not be empty",
          400
        ),
        { status: 400 }
      );
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 100;
    if (body.items.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Batch size exceeds maximum of ${MAX_BATCH_SIZE} items`,
          400
        ),
        { status: 400 }
      );
    }

    // Validate each item has an ID
    const invalidItems = body.items.filter((item) => !item.id || !item.data);
    if (invalidItems.length > 0) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          "All items must have 'id' and 'data' properties",
          400
        ),
        { status: 400 }
      );
    }

    const mode = body.mode || "individual";

    // Process based on mode
    if (mode === "atomic") {
      // Atomic mode: all or nothing
      const results: BatchSubmissionResult[] = [];

      // Process all items
      for (const item of body.items) {
        const result = await processItem(item);
        results.push({
          id: item.id,
          success: result.success,
          data: result.data,
          error: result.error,
        });

        // If any fails in atomic mode, rollback
        if (!result.success) {
          return NextResponse.json(
            createErrorResponse(
              ErrorCode.VALIDATION_ERROR,
              `Atomic batch failed at item ${item.id}: ${result.error?.message}`,
              400
            ),
            { status: 400 }
          );
        }
      }

      const response: BatchSubmissionResponse = {
        success: true,
        mode: "atomic",
        results,
        successCount: results.length,
        failureCount: 0,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(createSuccessResponse(response), { status: 200 });
    } else {
      // Individual mode: process each independently
      const results: BatchSubmissionResult[] = [];

      for (const item of body.items) {
        const result = await processItem(item);
        results.push({
          id: item.id,
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      const response: BatchSubmissionResponse = {
        success: failureCount === 0,
        mode: "individual",
        results,
        successCount,
        failureCount,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(createSuccessResponse(response), { status: 200 });
    }
  } catch (error) {
    console.error("[Batch Submissions] Error:", error);
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to process batch submissions",
        500
      ),
      { status: 500 }
    );
  }
}

/**
 * GET /api/batch/submissions
 * Get batch processing status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = {
      maxBatchSize: 100,
      supportedModes: ["atomic", "individual"],
      avgProcessingTime: "~10ms per item",
      rateLimit: "100 requests per minute",
    };

    return NextResponse.json(createSuccessResponse(stats), { status: 200 });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Failed to fetch batch statistics",
        500
      ),
      { status: 500 }
    );
  }
}
