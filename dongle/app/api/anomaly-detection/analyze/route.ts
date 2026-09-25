/**
 * Form Submission Analysis API
 * POST: Analyze a form submission for anomalies
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AnomalyManager } from "@/services/anomaly-detection";
import { DEFAULT_CONFIG } from "@/services/anomaly-detection/config";
import type {
  FormSubmissionMetrics,
} from "@/services/anomaly-detection";

// Global anomaly manager instance
let anomalyManager: AnomalyManager | null = null;

function getAnomalyManager(): AnomalyManager {
  if (!anomalyManager) {
    anomalyManager = new AnomalyManager(DEFAULT_CONFIG);
  }
  return anomalyManager;
}

export const dynamic = "force-dynamic";

/**
 * POST /api/anomaly-detection/analyze
 * Analyze a form submission for anomalies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      submission,
      formType,
      userId,
      walletFingerprint,
    } = body;

    if (!submission) {
      return NextResponse.json(
        { error: "submission data is required" },
        { status: 400 }
      );
    }

    if (!formType) {
      return NextResponse.json(
        { error: "formType is required" },
        { status: 400 }
      );
    }

    // Validate submission metrics structure
    const requiredFields: (keyof FormSubmissionMetrics)[] = [
      "submissionTime",
      "fieldCount",
      "characterCount",
      "pasteEventCount",
      "autoFillDetected",
      "deviceFingerprint",
      "ipHash",
      "timestamp",
      "userAgent",
      "sessionDuration",
      "completionRate",
      "correctionCount",
      "tabSwitchCount",
      "focusLossCount",
    ];

    const missingFields = requiredFields.filter(
      (field) => !(field in submission)
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    const manager = getAnomalyManager();

    // Process submission
    const flagged = manager.processSubmission(
      submission as FormSubmissionMetrics,
      formType,
      userId,
      walletFingerprint
    );

    return NextResponse.json({
      success: true,
      flagged: flagged ? true : false,
      flag: flagged || null,
      message: flagged
        ? `Submission flagged for review (Score: ${(flagged.anomalyScore.overallScore * 100).toFixed(1)}%)`
        : "Submission appears normal",
    });
  } catch (error) {
    console.error("[anomaly-detection/analyze] POST error:", error);
    return NextResponse.json(
      { error: "Failed to analyze submission" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/anomaly-detection/analyze
 * Get analysis configuration and info
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    const manager = getAnomalyManager();

    if (action === "config") {
      // Get current configuration
      return NextResponse.json({
        config: DEFAULT_CONFIG,
      });
    }

    if (action === "schema") {
      // Get expected submission schema
      return NextResponse.json({
        schema: {
          submissionTime: "number (milliseconds)",
          fieldCount: "number",
          characterCount: "number",
          pasteEventCount: "number",
          autoFillDetected: "boolean",
          deviceFingerprint: "string (hashed)",
          ipHash: "string (hashed)",
          timestamp: "number (unix timestamp)",
          userAgent: "string",
          sessionDuration: "number (milliseconds)",
          completionRate: "number (0-1)",
          correctionCount: "number",
          tabSwitchCount: "number",
          focusLossCount: "number",
        },
        description:
          "Expected structure for FormSubmissionMetrics to be analyzed",
      });
    }

    return NextResponse.json({
      enabled: DEFAULT_CONFIG.enabled,
      features: DEFAULT_CONFIG.features,
      thresholds: DEFAULT_CONFIG.thresholds,
    });
  } catch (error) {
    console.error("[anomaly-detection/analyze] GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve configuration" },
      { status: 500 }
    );
  }
}
