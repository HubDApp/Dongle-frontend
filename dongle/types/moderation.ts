import type { Review } from "@/types/review";

export type FlaggedReviewStatus = "pending" | "approved" | "rejected";

export interface FlaggedReview {
  id: string;
  reviewId: string;
  review: Review;
  riskScore: number;
  flags: string[];
  status: FlaggedReviewStatus;
  flaggedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  requiresCaptcha: boolean;
}

export interface SpamStatistics {
  totalFlagged: number;
  totalApproved: number;
  totalRejected: number;
  falsePositiveRate: number;
  flaggedRate: number;
  approvedRate: number;
}

export type ModerationBulkAction = "approve" | "reject" | "ban";

export interface BannedReviewer {
  walletAddress: string;
  bannedAt: string;
  bannedBy: string;
  reason: string;
}
