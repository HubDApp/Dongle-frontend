import type { Review } from "@/types/review";

export interface StoredReview extends Review {
  helpfulVotes: string[];
  unhelpfulVotes: string[];
}

const reviews = new Map<string, StoredReview>();

export function getReviewStore(): Map<string, StoredReview> {
  return reviews;
}