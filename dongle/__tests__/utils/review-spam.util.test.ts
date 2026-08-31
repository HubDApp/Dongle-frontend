import { describe, it, expect, beforeEach } from "vitest";
import {
  assessReviewSpam,
  countReviewsInLast24Hours,
} from "@/utils/review-spam.util";
import { REVIEW_VELOCITY_DAILY_LIMIT } from "@/constants/limits";

describe("review-spam.util", () => {
  it("flags short comments", () => {
    const result = assessReviewSpam("too short");
    expect(result.flags).toContain("Comment is too short");
    expect(result.riskScore).toBeGreaterThanOrEqual(35);
  });

  it("flags ALL CAPS content", () => {
    const result = assessReviewSpam("THIS PROJECT IS AMAZING AND GREAT");
    expect(result.flags).toContain("Excessive ALL CAPS");
  });

  it("flags repeated characters", () => {
    const result = assessReviewSpam("greaaaaat project indeed");
    expect(result.flags).toContain("Repeated character pattern");
  });

  it("requires captcha at velocity limit", () => {
    const result = assessReviewSpam("This is a normal length review comment.", REVIEW_VELOCITY_DAILY_LIMIT);
    expect(result.requiresCaptcha).toBe(true);
  });

  it("counts reviews in last 24 hours", () => {
    const now = Date.now();
    const reviews = [
      { userAddress: "GABC", createdAt: new Date(now - 1000).toISOString() },
      { userAddress: "GABC", createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
      { userAddress: "GXYZ", createdAt: new Date(now - 1000).toISOString() },
    ];
    expect(countReviewsInLast24Hours(reviews, "GABC", now)).toBe(2);
  });
});
