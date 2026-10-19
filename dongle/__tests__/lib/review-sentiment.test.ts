import { describe, expect, it } from "vitest";
import {
  classifyReviewSentiment,
  getPositiveSentimentPercentage,
} from "@/lib/review-sentiment";
import type { Review } from "@/types/review";

describe("review sentiment", () => {
  it("classifies positive, negative, and neutral review text", () => {
    expect(classifyReviewSentiment("Excellent product, I love it!")).toBe("positive");
    expect(classifyReviewSentiment("Terrible experience, I hate it.")).toBe("negative");
    expect(classifyReviewSentiment("The product has three features.")).toBe("neutral");
  });

  it("calculates positive percentage using classified reviews only", () => {
    const reviews = [
      { sentiment: "positive" },
      { sentiment: "positive" },
      { sentiment: "negative" },
      {},
    ] as Review[];

    expect(getPositiveSentimentPercentage(reviews)).toBe(67);
    expect(getPositiveSentimentPercentage([{} as Review])).toBeNull();
  });
});
