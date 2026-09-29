import { describe, it, expect, beforeEach } from "vitest";
import {
  banReviewer,
  bulkModerationAction,
  flagReviewForModeration,
  getSpamStatistics,
  isReviewerBanned,
  recordReviewSubmission,
  resetModerationStore,
} from "@/lib/moderation-store";
import type { Review } from "@/types/review";

const sampleReview = (overrides: Partial<Review> = {}): Review => ({
  id: "review-1",
  projectId: "proj-1",
  projectName: "Demo",
  userAddress: "GABC123",
  rating: 5,
  comment: "SPAM SPAM SPAM SPAM SPAM",
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("moderation-store", () => {
  beforeEach(() => {
    resetModerationStore();
  });

  it("flags high-risk reviews", () => {
    const flagged = flagReviewForModeration(sampleReview());
    expect(flagged).not.toBeNull();
    expect(flagged!.riskScore).toBeGreaterThanOrEqual(30);
  });

  it("flags wallets with high velocity", () => {
    for (let i = 0; i < 10; i += 1) {
      recordReviewSubmission("GVELOCITY", new Date().toISOString());
    }
    const flagged = flagReviewForModeration(
      sampleReview({ userAddress: "GVELOCITY", comment: "Normal review text here." }),
    );
    expect(flagged?.requiresCaptcha).toBe(true);
  });

  it("supports bulk approve and ban", () => {
    const flagged = flagReviewForModeration(sampleReview())!;
    const approve = bulkModerationAction([flagged.id], "approve", "GMOD", "ok");
    expect(approve.succeeded).toHaveLength(1);

    const flagged2 = flagReviewForModeration(sampleReview({ id: "review-2" }))!;
    bulkModerationAction([flagged2.id], "ban", "GMOD", "spam");
    expect(isReviewerBanned("GABC123")).toBe(true);
  });

  it("tracks spam statistics", () => {
    const flagged = flagReviewForModeration(sampleReview())!;
    bulkModerationAction([flagged.id], "approve", "GMOD");
    const stats = getSpamStatistics();
    expect(stats.totalFlagged).toBeGreaterThan(0);
    expect(stats.totalApproved).toBe(1);
  });
});
