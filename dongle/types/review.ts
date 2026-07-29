import { Project } from "@/types/project";
import { z } from "zod";

export interface Review {
  id: string;
  projectId: string;
  projectName: string;
  userAddress: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpfulVotes?: string[];
  unhelpfulVotes?: string[];
}

// Validation constraints
export const REVIEW_CONSTRAINTS = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  COMMENT_MIN_LENGTH: 10,
  COMMENT_MAX_LENGTH: 1000,
} as const;

export interface ReviewValidationError {
  field: "rating" | "comment";
  message: string;
}

// ─── Review Reporting Types ─────────────────────────────────────────────────

export type ReviewReportReason =
  | "spam"
  | "abusive"
  | "inappropriate"
  | "misleading"
  | "harassment"
  | "other";

export type ReviewReportStatus = "pending" | "resolved" | "dismissed";

export type ModerationActionType = "resolved" | "dismissed";

export const REVIEW_REPORT_REASONS: { value: ReviewReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "abusive", label: "Abusive or Hateful" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "misleading", label: "Misleading or False" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Other" },
];

export const REVIEW_REPORT_CONSTRAINTS = {
  EXPLANATION_MAX_LENGTH: 2000,
} as const;

export interface ReviewReport {
  id: string;
  reviewId: string;
  reporterAddress: string;
  reason: ReviewReportReason;
  explanation: string;
  status: ReviewReportStatus;
  createdAt: string;
}

export interface ModerationAction {
  id: string;
  reportId: string;
  moderatorAddress: string;
  action: ModerationActionType;
  reason: string;
  timestamp: string;
}

export interface ReviewReportValidationError {
  field: "reason" | "explanation";
  message: string;
}

// Re-export Project for backward compatibility in components
export type { Project };

