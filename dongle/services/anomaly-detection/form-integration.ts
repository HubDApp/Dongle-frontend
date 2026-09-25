/**
 * Form Integration Utilities
 * Helps integrate anomaly detection into existing form submission flows
 */

import { AnomalyManager } from "./manager";
import { getConfig } from "./config";
import type { FormSubmissionMetrics, FlaggedSubmission } from "./types";

/**
 * Integration helper class for form submission workflows
 */
export class FormAnomalyIntegration {
  private manager: AnomalyManager;

  constructor(formType?: string) {
    const config = getConfig(formType);
    this.manager = new AnomalyManager(config);
  }

  /**
   * Process a form submission through anomaly detection
   * Returns flagged submission if anomalies detected, null otherwise
   */
  async analyzeFormSubmission(
    metrics: FormSubmissionMetrics,
    formType: string,
    userId?: string,
    walletFingerprint?: string
  ): Promise<{
    flagged: boolean;
    flag?: FlaggedSubmission;
    score?: number;
    severity?: string;
    message?: string;
  }> {
    try {
      const result = this.manager.processSubmission(
        metrics,
        formType,
        userId,
        walletFingerprint
      );

      if (result) {
        return {
          flagged: true,
          flag: result,
          score: result.anomalyScore.overallScore,
          severity: result.anomalyScore.severity,
          message: `Submission flagged for review (${result.anomalyScore.severity} severity)`,
        };
      }

      return {
        flagged: false,
        message: "Submission appears normal",
      };
    } catch (error) {
      console.error("[FormAnomalyIntegration] Analysis error:", error);
      return {
        flagged: false,
        message: "Unable to analyze submission",
      };
    }
  }

  /**
   * Get pending submissions for review
   */
  getPendingReviews(formType?: string, limit: number = 50): FlaggedSubmission[] {
    return this.manager.getPendingReviews(formType, undefined, limit);
  }

  /**
   * Get statistics about form submissions
   */
  getStatistics() {
    return this.manager.getStats();
  }

  /**
   * Review a flagged submission
   * Call after human review is complete
   */
  reviewSubmission(
    flagId: string,
    status: "approved" | "rejected" | "investigating",
    reviewNotes?: string,
    reviewedBy?: string,
    isAnomaly?: boolean
  ) {
    return this.manager.reviewSubmission(
      flagId,
      status,
      reviewNotes,
      reviewedBy,
      isAnomaly
    );
  }

  /**
   * Record feedback to improve the model
   */
  recordFeedback(
    submissionId: string,
    isAnomaly: boolean,
    feedback: string,
    correctedMetrics?: Partial<FormSubmissionMetrics>
  ) {
    this.manager.recordFeedback(
      submissionId,
      isAnomaly,
      feedback,
      correctedMetrics
    );
  }

  /**
   * Export submissions for compliance/audit
   */
  exportSubmissions(filters?: {
    formType?: string;
    severity?: string;
    reviewStatus?: string;
    startDate?: number;
    endDate?: number;
  }) {
    return this.manager.exportFlaggedSubmissions(filters);
  }
}

/**
 * Middleware helper for API routes
 * Use in form submission endpoints to automatically check for anomalies
 */
export async function checkFormAnomaly(
  metrics: FormSubmissionMetrics,
  formType: string,
  options?: {
    userId?: string;
    walletFingerprint?: string;
    requireApprovalForFlagged?: boolean;
    autoRejectCritical?: boolean;
  }
): Promise<{
  allow: boolean;
  reason?: string;
  flagId?: string;
  severity?: string;
}> {
  const integration = new FormAnomalyIntegration(formType);

  try {
    const analysis = await integration.analyzeFormSubmission(
      metrics,
      formType,
      options?.userId,
      options?.walletFingerprint
    );

    if (!analysis.flagged) {
      return { allow: true };
    }

    if (options?.autoRejectCritical && analysis.severity === "critical") {
      return {
        allow: false,
        reason: "Submission blocked due to critical anomaly detection",
        flagId: analysis.flag?.id,
        severity: analysis.severity,
      };
    }

    if (options?.requireApprovalForFlagged) {
      return {
        allow: false,
        reason: `Submission flagged (${analysis.severity}). Awaiting review.`,
        flagId: analysis.flag?.id,
        severity: analysis.severity,
      };
    }

    // Allow but flag for review
    return {
      allow: true,
      reason: `Submission flagged for review (${analysis.severity})`,
      flagId: analysis.flag?.id,
      severity: analysis.severity,
    };
  } catch (error) {
    console.error("[checkFormAnomaly] Error:", error);
    // Default to allow on error to avoid blocking legitimate submissions
    return { allow: true, reason: "Anomaly check failed, allowing submission" };
  }
}

/**
 * Helper to calculate device fingerprint on server
 * For use in API routes to match client-side fingerprinting
 */
export function calculateServerDeviceFingerprint(userAgent: string): string {
  // Simple hash for demonstration
  // In production, would use a more robust fingerprinting library
  let hash = 0;
  for (let i = 0; i < userAgent.length; i++) {
    const char = userAgent.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(16).substring(0, 8)}`;
}

/**
 * Sanitize submission metrics to prevent data leakage
 * Removes sensitive fields that shouldn't be logged
 */
export function sanitizeMetricsForLogging(
  metrics: FormSubmissionMetrics
): Partial<FormSubmissionMetrics> {
  return {
    submissionTime: metrics.submissionTime,
    fieldCount: metrics.fieldCount,
    characterCount: metrics.characterCount,
    pasteEventCount: metrics.pasteEventCount,
    autoFillDetected: metrics.autoFillDetected,
    timestamp: metrics.timestamp,
    sessionDuration: metrics.sessionDuration,
    completionRate: metrics.completionRate,
    correctionCount: metrics.correctionCount,
    tabSwitchCount: metrics.tabSwitchCount,
    focusLossCount: metrics.focusLossCount,
    // Note: deviceFingerprint, ipHash, userAgent are intentionally omitted
  };
}
