import type { Review } from "@/types/review";

export interface StoredReview extends Review {
  helpfulVotes: string[];
  unhelpfulVotes: string[];
}

const globalForReviews = globalThis as typeof globalThis & {
  dongleReviewStore?: Map<string, StoredReview>;
};

export const reviewStore =
  globalForReviews.dongleReviewStore ?? new Map<string, StoredReview>();

globalForReviews.dongleReviewStore = reviewStore;
