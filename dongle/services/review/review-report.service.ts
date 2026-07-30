import {
  ReviewReport,
  ReviewReportReason,
  ReviewReportStatus,
  ReviewReportValidationError,
  ModerationAction,
  ModerationActionType,
  REVIEW_REPORT_CONSTRAINTS,
} from "@/types/review";
import { generateId } from "@/lib/id-generator";
import { reviewService } from "./review.service";

const STORAGE_KEY_REPORTS = "dongle_review_reports";
const STORAGE_KEY_MODERATION_LOG = "dongle_review_moderation_log";

/**
 * Validates report data before persistence
 */
function validateReport(
  reason: string,
  explanation: string
): ReviewReportValidationError[] {
  const errors: ReviewReportValidationError[] = [];

  const validReasons: ReviewReportReason[] = [
    "spam",
    "abusive",
    "inappropriate",
    "misleading",
    "harassment",
    "other",
  ];

  if (!validReasons.includes(reason as ReviewReportReason)) {
    errors.push({
      field: "reason",
      message: "Please select a valid reason for reporting",
    });
  }

  if (explanation.length > REVIEW_REPORT_CONSTRAINTS.EXPLANATION_MAX_LENGTH) {
    errors.push({
      field: "explanation",
      message: `Explanation cannot exceed ${REVIEW_REPORT_CONSTRAINTS.EXPLANATION_MAX_LENGTH} characters`,
    });
  }

  return errors;
}

export const reviewReportService = {
  // ─── Report CRUD ─────────────────────────────────────────────────────────

  getReports(): ReviewReport[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (!stored) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validatedReports: ReviewReport[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;

      const record = item as Record<string, unknown>;

      if (typeof record.id !== "string" || !record.id) continue;
      if (typeof record.reviewId !== "string" || !record.reviewId) continue;
      if (typeof record.reporterAddress !== "string" || !record.reporterAddress) continue;
      if (typeof record.reason !== "string") continue;
      if (typeof record.explanation !== "string") continue;
      if (typeof record.status !== "string") continue;
      if (typeof record.createdAt !== "string") continue;

      const report: ReviewReport = {
        id: record.id,
        reviewId: record.reviewId,
        reporterAddress: record.reporterAddress,
        reason: record.reason as ReviewReportReason,
        explanation: record.explanation,
        status: record.status as ReviewReportStatus,
        createdAt: record.createdAt,
        assignedTo: typeof record.assignedTo === "string" ? record.assignedTo : undefined,
        assignedAt: typeof record.assignedAt === "string" ? record.assignedAt : undefined,
      };

      validatedReports.push(report);
    }

    return validatedReports;
  },

  getReportById(id: string): ReviewReport | null {
    return this.getReports().find((r) => r.id === id) ?? null;
  },

  getReportsByReview(reviewId: string): ReviewReport[] {
    return this.getReports().filter((r) => r.reviewId === reviewId);
  },

  getReportsByReporter(reporterAddress: string): ReviewReport[] {
    return this.getReports().filter((r) => r.reporterAddress === reporterAddress);
  },

  getPendingReports(): ReviewReport[] {
    return this.getReports().filter((r) => r.status === "pending");
  },

  assignReport(
    reportId: string,
    assignedBy: string,
    assignedTo: string,
  ): { success: boolean; error?: string } {
    const reports = this.getReports();
    const index = reports.findIndex((r) => r.id === reportId);

    if (index === -1) {
      return { success: false, error: "Report not found" };
    }

    // Update report assignment
    reports[index] = {
      ...reports[index],
      assignedTo,
      assignedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));

    return { success: true };
  },

  unassignReport(
    reportId: string,
    unassignedBy: string,
  ): { success: boolean; error?: string } {
    const reports = this.getReports();
    const index = reports.findIndex((r) => r.id === reportId);

    if (index === -1) {
      return { success: false, error: "Report not found" };
    }

    // Remove assignment
    reports[index] = {
      ...reports[index],
      assignedTo: undefined,
      assignedAt: undefined,
    };
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));

    return { success: true };
  },

  getReportsAssignedTo(adminAddress: string): ReviewReport[] {
    return this.getReports().filter((r) => r.assignedTo === adminAddress);
  },

  getUnassignedReports(): ReviewReport[] {
    return this.getReports().filter((r) => !r.assignedTo);
  },

  hasUserReportedReview(reviewId: string, userAddress: string): boolean {
    return this.getReports().some(
      (r) => r.reviewId === reviewId && r.reporterAddress === userAddress
    );
  },

  async createReport(
    data: {
      reviewId: string;
      reason: string;
      explanation: string;
    },
    reporterAddress: string
  ): Promise<{
    success: boolean;
    data?: ReviewReport;
    errors?: ReviewReportValidationError[];
  }> {
    // Validate input
    const validationErrors = validateReport(data.reason, data.explanation);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    // Verify the review exists
    const reviews = await reviewService.getReviews();
    const review = reviews.find((r) => r.id === data.reviewId);
    if (!review) {
      return {
        success: false,
        errors: [{ field: "reason", message: "Review not found" }],
      };
    }

    // Prevent self-reporting: review authors cannot report their own reviews
    if (review.userAddress === reporterAddress) {
      return {
        success: false,
        errors: [
          {
            field: "reason",
            message: "You cannot report your own review",
          },
        ],
      };
    }

    // Prevent duplicate reports from the same user on the same review
    if (this.hasUserReportedReview(data.reviewId, reporterAddress)) {
      return {
        success: false,
        errors: [
          {
            field: "reason",
            message: "You have already reported this review",
          },
        ],
      };
    }

    const newReport: ReviewReport = {
      id: generateId(),
      reviewId: data.reviewId,
      reporterAddress,
      reason: data.reason as ReviewReportReason,
      explanation: data.explanation,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const reports = this.getReports();
    const updatedReports = [newReport, ...reports];
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(updatedReports));

    return { success: true, data: newReport };
  },

  // ─── Moderation Actions ──────────────────────────────────────────────────

  resolveReport(
    reportId: string,
    moderatorAddress: string,
    reason: string
  ): { success: boolean; error?: string } {
    const reports = this.getReports();
    const index = reports.findIndex((r) => r.id === reportId);

    if (index === -1) {
      return { success: false, error: "Report not found" };
    }

    if (reports[index].status !== "pending") {
      return { success: false, error: "Report has already been moderated" };
    }

    // Update report status
    reports[index] = {
      ...reports[index],
      status: "resolved",
    };
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));

    // Record audit trail
    const action: ModerationAction = {
      id: generateId(),
      reportId,
      moderatorAddress,
      action: "resolved",
      reason,
      timestamp: new Date().toISOString(),
    };

    const log = this.getModerationLog();
    const updatedLog = [...log, action];
    localStorage.setItem(STORAGE_KEY_MODERATION_LOG, JSON.stringify(updatedLog));

    return { success: true };
  },

  dismissReport(
    reportId: string,
    moderatorAddress: string,
    reason: string
  ): { success: boolean; error?: string } {
    const reports = this.getReports();
    const index = reports.findIndex((r) => r.id === reportId);

    if (index === -1) {
      return { success: false, error: "Report not found" };
    }

    if (reports[index].status !== "pending") {
      return { success: false, error: "Report has already been moderated" };
    }

    // Update report status
    reports[index] = {
      ...reports[index],
      status: "dismissed",
    };
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));

    // Record audit trail
    const action: ModerationAction = {
      id: generateId(),
      reportId,
      moderatorAddress,
      action: "dismissed",
      reason,
      timestamp: new Date().toISOString(),
    };

    const log = this.getModerationLog();
    const updatedLog = [...log, action];
    localStorage.setItem(STORAGE_KEY_MODERATION_LOG, JSON.stringify(updatedLog));

    return { success: true };
  },

  // ─── Audit Trail ─────────────────────────────────────────────────────────

  getModerationLog(): ModerationAction[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY_MODERATION_LOG);
    if (!stored) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validatedActions: ModerationAction[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;

      const record = item as Record<string, unknown>;

      if (typeof record.id !== "string" || !record.id) continue;
      if (typeof record.reportId !== "string" || !record.reportId) continue;
      if (typeof record.moderatorAddress !== "string" || !record.moderatorAddress) continue;
      if (typeof record.action !== "string") continue;
      if (typeof record.reason !== "string") continue;
      if (typeof record.timestamp !== "string") continue;

      const action: ModerationAction = {
        id: record.id,
        reportId: record.reportId,
        moderatorAddress: record.moderatorAddress,
        action: record.action as ModerationActionType,
        reason: record.reason,
        timestamp: record.timestamp,
      };

      validatedActions.push(action);
    }

    return validatedActions;
  },

  getModerationLogByReport(reportId: string): ModerationAction[] {
    return this.getModerationLog().filter((a) => a.reportId === reportId);
  },
};
