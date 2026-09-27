/**
 * Form Anomaly Detection API
 * GET: Retrieve flagged submissions for review
 * POST: Review a flagged submission and provide feedback
 * PATCH: Update anomaly detection configuration
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AnomalyManager } from "@/services/anomaly-detection";
import { DEFAULT_CONFIG } from "@/services/anomaly-detection/config";

// Global anomaly manager instance (in production, use a database/store)
let anomalyManager: AnomalyManager | null = null;

function getAnomalyManager(): AnomalyManager {
  if (!anomalyManager) {
    anomalyManager = new AnomalyManager(DEFAULT_CONFIG);
  }
  return anomalyManager;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/anomaly-detection/flags
 * Retrieve flagged submissions for review
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const formType = url.searchParams.get("formType");
    const severity = url.searchParams.get("severity");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const manager = getAnomalyManager();

    if (action === "stats") {
      // Get anomaly detection statistics
      const stats = manager.getStats();
      return NextResponse.json(stats);
    }

    if (action === "submission") {
      // Get specific submission by ID
      const flagId = url.searchParams.get("flagId");
      if (!flagId) {
        return NextResponse.json(
          { error: "flagId is required" },
          { status: 400 }
        );
      }

      const submission = manager.getSubmission(flagId);
      if (!submission) {
        return NextResponse.json(
          { error: "Submission not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(submission);
    }

    if (action === "feedback-history") {
      // Get feedback history
      const feedbackLimit = parseInt(url.searchParams.get("feedbackLimit") || "100");
      const history = manager.getFeedbackHistory(feedbackLimit);
      return NextResponse.json({ feedback: history, count: history.length });
    }

    if (action === "model-accuracy") {
      // Get model performance metrics
      const accuracy = manager.calculateModelAccuracy();
      return NextResponse.json(accuracy);
    }

    if (action === "export") {
      // Export flagged submissions
      const startDate = url.searchParams.get("startDate")
        ? parseInt(url.searchParams.get("startDate")!)
        : undefined;
      const endDate = url.searchParams.get("endDate")
        ? parseInt(url.searchParams.get("endDate")!)
        : undefined;
      const reviewStatus = url.searchParams.get("reviewStatus");

      const submissions = manager.exportFlaggedSubmissions({
        formType: formType || undefined,
        severity: severity || undefined,
        reviewStatus: reviewStatus || undefined,
        startDate,
        endDate,
      });

      return NextResponse.json({
        count: submissions.length,
        submissions,
        exportedAt: new Date().toISOString(),
      });
    }

    // Default: Get pending reviews
    const pending = manager.getPendingReviews(formType || undefined, severity, limit);
    return NextResponse.json({
      count: pending.length,
      limit,
      submissions: pending,
    });
  } catch (error) {
    console.error("[anomaly-detection] GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve flagged submissions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/anomaly-detection/flags
 * Review a flagged submission and provide feedback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      flagId,
      action,
      status,
      reviewNotes,
      reviewedBy,
      isAnomaly,
      feedback,
      correctedMetrics,
    } = body;

    if (!flagId) {
      return NextResponse.json(
        { error: "flagId is required" },
        { status: 400 }
      );
    }

    const manager = getAnomalyManager();

    if (action === "review") {
      // Review a flagged submission
      if (!status || !["approved", "rejected", "investigating"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }

      const result = manager.reviewSubmission(
        flagId,
        status,
        reviewNotes,
        reviewedBy,
        isAnomaly
      );

      if (!result) {
        return NextResponse.json(
          { error: "Submission not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        submission: result,
      });
    }

    if (action === "feedback") {
      // Record learning feedback
      if (isAnomaly === undefined) {
        return NextResponse.json(
          { error: "isAnomaly is required" },
          { status: 400 }
        );
      }

      manager.recordFeedback(
        flagId,
        isAnomaly,
        feedback || "",
        correctedMetrics
      );

      return NextResponse.json({
        success: true,
        message: "Feedback recorded for model learning",
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[anomaly-detection] POST error:", error);
    return NextResponse.json(
      { error: "Failed to process review" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/anomaly-detection/flags
 * Update anomaly detection configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { configUpdates, action } = body;

    const manager = getAnomalyManager();

    if (action === "update-config") {
      if (!configUpdates) {
        return NextResponse.json(
          { error: "configUpdates is required" },
          { status: 400 }
        );
      }

      manager.updateConfig(configUpdates);

      return NextResponse.json({
        success: true,
        message: "Configuration updated",
      });
    }

    if (action === "cleanup") {
      // Clean up old data
      const daysToKeep = body.daysToKeep || 90;
      const removedCount = manager.clearOldData(daysToKeep);

      return NextResponse.json({
        success: true,
        message: `Removed ${removedCount} old entries`,
        removedCount,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[anomaly-detection] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}
