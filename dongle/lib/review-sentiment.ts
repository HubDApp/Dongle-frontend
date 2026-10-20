import Sentiment from "sentiment";
import type { Review, ReviewSentiment } from "@/types/review";

const analyzer = new Sentiment();

export function classifyReviewSentiment(comment: string): ReviewSentiment {
  const score = analyzer.analyze(comment).score;
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

export function getPositiveSentimentPercentage(reviews: Review[]): number | null {
  const classified = reviews.filter((review) => review.sentiment);
  if (!classified.length) return null;

  const positive = classified.filter(
    (review) => review.sentiment === "positive",
  ).length;
  return Math.round((positive / classified.length) * 100);
}
