import type { Review } from "@/types/review";
import type {
  BannedReviewer,
  FlaggedReview,
  FlaggedReviewStatus,
  ModerationBulkAction,
  SpamStatistics,
} from "@/types/moderation";
import { REVIEW_VELOCITY_DAILY_LIMIT } from "@/constants/limits";
import {
  assessReviewSpam,
  countReviewsInLast24Hours,
} from "@/utils/review-spam.util";

const flaggedReviews = new Map<string, FlaggedReview>();
const bannedReviewers = new Map<string, BannedReviewer>();
const reviewSubmissionLog: { userAddress: string; createdAt: string }[] = [];

let falsePositiveCount = 0;
let resolvedApproved = 0;
let resolvedRejected = 0;

function generateId(): string {
  return crypto.randomUUID();
}

export function isReviewerBanned(walletAddress: string): boolean {
  return bannedReviewers.has(walletAddress);
}

export function getBannedReviewers(): BannedReviewer[] {
  return Array.from(bannedReviewers.values());
}

export function banReviewer(
  walletAddress: string,
  bannedBy: string,
  reason: string,
): BannedReviewer {
  const entry: BannedReviewer = {
    walletAddress,
    bannedAt: new Date().toISOString(),
    bannedBy,
    reason,
  };
  bannedReviewers.set(walletAddress, entry);
  return entry;
}

export function recordReviewSubmission(userAddress: string, createdAt: string): number {
  reviewSubmissionLog.push({ userAddress, createdAt });
  return countReviewsInLast24Hours(reviewSubmissionLog, userAddress);
}

export function getDailyReviewCount(userAddress: string): number {
  return countReviewsInLast24Hours(reviewSubmissionLog, userAddress);
}

export function requiresCaptcha(userAddress: string): boolean {
  return getDailyReviewCount(userAddress) >= REVIEW_VELOCITY_DAILY_LIMIT;
}

export function flagReviewForModeration(
  review: Review,
  dailyCount?: number,
): FlaggedReview | null {
  if (isReviewerBanned(review.userAddress)) {
    return null;
  }

  const count = dailyCount ?? getDailyReviewCount(review.userAddress);
  const assessment = assessReviewSpam(review.comment, count);
  const serverVelocityFlag = count >= REVIEW_VELOCITY_DAILY_LIMIT;

  if (assessment.riskScore < 30 && !serverVelocityFlag) {
    return null;
  }

  const flags = [...assessment.flags];
  if (serverVelocityFlag && !flags.includes("High review velocity — CAPTCHA required")) {
    flags.push(`Wallet submitted ${count}+ reviews in 24h`);
  }

  const riskScore = serverVelocityFlag
    ? Math.max(assessment.riskScore, 75)
    : assessment.riskScore;

  const flagged: FlaggedReview = {
    id: generateId(),
    reviewId: review.id,
    review,
    riskScore,
    flags,
    status: "pending",
    flaggedAt: new Date().toISOString(),
    requiresCaptcha: assessment.requiresCaptcha || serverVelocityFlag,
  };

  flaggedReviews.set(flagged.id, flagged);
  return flagged;
}

export function getFlaggedReviews(status?: FlaggedReviewStatus): FlaggedReview[] {
  const all = Array.from(flaggedReviews.values());
  if (!status) return all.sort((a, b) => b.riskScore - a.riskScore);
  return all
    .filter((f) => f.status === status)
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function resolveFlaggedReview(
  flaggedId: string,
  status: "approved" | "rejected",
  resolvedBy: string,
  resolutionNote?: string,
  wasFalsePositive = false,
): FlaggedReview | null {
  const item = flaggedReviews.get(flaggedId);
  if (!item) return null;

  item.status = status;
  item.resolvedAt = new Date().toISOString();
  item.resolvedBy = resolvedBy;
  item.resolutionNote = resolutionNote;

  if (status === "approved") {
    resolvedApproved += 1;
    if (wasFalsePositive) falsePositiveCount += 1;
  } else {
    resolvedRejected += 1;
  }

  flaggedReviews.set(flaggedId, item);
  return item;
}

export function bulkModerationAction(
  flaggedIds: string[],
  action: ModerationBulkAction,
  moderatorAddress: string,
  reason?: string,
): { succeeded: string[]; failed: string[] } {
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const id of flaggedIds) {
    if (action === "ban") {
      const item = flaggedReviews.get(id);
      if (!item) {
        failed.push(id);
        continue;
      }
      banReviewer(item.review.userAddress, moderatorAddress, reason ?? "Bulk ban");
      resolveFlaggedReview(id, "rejected", moderatorAddress, reason);
      succeeded.push(id);
      continue;
    }

    const result = resolveFlaggedReview(
      id,
      action === "approve" ? "approved" : "rejected",
      moderatorAddress,
      reason,
      action === "approve",
    );

    if (result) succeeded.push(id);
    else failed.push(id);
  }

  return { succeeded, failed };
}

export function getSpamStatistics(): SpamStatistics {
  const all = Array.from(flaggedReviews.values());
  const totalFlagged = all.length;
  const pending = all.filter((f) => f.status === "pending").length;
  const totalApproved = resolvedApproved;
  const totalRejected = resolvedRejected;
  const resolved = totalApproved + totalRejected;

  return {
    totalFlagged,
    totalApproved,
    totalRejected,
    falsePositiveRate: resolved > 0 ? falsePositiveCount / resolved : 0,
    flaggedRate: totalFlagged > 0 ? (totalFlagged - pending) / totalFlagged : 0,
    approvedRate: resolved > 0 ? totalApproved / resolved : 0,
  };
}

/** Test helper — reset in-memory moderation state. */
export function resetModerationStore(): void {
  flaggedReviews.clear();
  bannedReviewers.clear();
  reviewSubmissionLog.length = 0;
  falsePositiveCount = 0;
  resolvedApproved = 0;
  resolvedRejected = 0;
}
