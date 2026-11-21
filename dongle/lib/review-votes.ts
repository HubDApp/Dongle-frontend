/**
 * Review Voting Helpers (#issue: Review Voting System)
 *
 * Pure, environment-agnostic helpers for the thumbs up/down voting feature.
 * This module is safe to import from both client components and server
 * (API route) code — it has no wallet or browser dependencies.
 *
 * A wallet may cast at most one helpful OR one unhelpful vote per review.
 * Voting the same way again removes the vote; voting the opposite way moves
 * the vote (up -> down or down -> up).
 */

import type { Review } from "@/types/review";

export type VoteKind = "helpful" | "unhelpful";

/** Signed message a voter authorizes. Verified server-side before persisting. */
export function buildVoteMessage(
  reviewId: string,
  voterAddress: string,
  kind: VoteKind,
): string {
  return `dongle:review-vote:v1:${reviewId}:${voterAddress}:${kind}`;
}

export function helpfulVoteCount(review: Review): number {
  return Array.isArray(review.helpfulVotes) ? review.helpfulVotes.length : 0;
}

export function unhelpfulVoteCount(review: Review): number {
  return Array.isArray(review.unhelpfulVotes) ? review.unhelpfulVotes.length : 0;
}

/** Net helpfulness score = helpful votes − unhelpful votes. */
export function helpfulnessScore(review: Review): number {
  return helpfulVoteCount(review) - unhelpfulVoteCount(review);
}

/** Whether the given voter currently has a helpful vote on the review. */
export function hasVotedHelpful(review: Review, voterAddress: string | null): boolean {
  if (!voterAddress) return false;
  return Array.isArray(review.helpfulVotes) && review.helpfulVotes.includes(voterAddress);
}

/** Whether the given voter currently has an unhelpful vote on the review. */
export function hasVotedUnhelpful(review: Review, voterAddress: string | null): boolean {
  if (!voterAddress) return false;
  return Array.isArray(review.unhelpfulVotes) && review.unhelpfulVotes.includes(voterAddress);
}

/**
 * Pure toggle used for optimistic UI updates. Returns a NEW review with the
 * vote applied, removed, or moved. Never mutates the input.
 */
export function applyVote(
  review: Review,
  voterAddress: string,
  kind: VoteKind,
): Review & { helpfulVotes: string[]; unhelpfulVotes: string[] } {
  const helpful = new Set(review.helpfulVotes ?? []);
  const unhelpful = new Set(review.unhelpfulVotes ?? []);

  if (kind === "helpful") {
    if (helpful.has(voterAddress)) {
      helpful.delete(voterAddress);
    } else {
      helpful.add(voterAddress);
      unhelpful.delete(voterAddress);
    }
  } else {
    if (unhelpful.has(voterAddress)) {
      unhelpful.delete(voterAddress);
    } else {
      unhelpful.add(voterAddress);
      helpful.delete(voterAddress);
    }
  }

  return { ...review, helpfulVotes: [...helpful], unhelpfulVotes: [...unhelpful] };
}

/**
 * Comparator for "sort by helpfulness": highest net score first, then most
 * recent. Returns a negative/zero/positive number for use with Array.sort.
 */
export function compareByHelpfulness(a: Review, b: Review): number {
  const scoreA = helpfulnessScore(a);
  const scoreB = helpfulnessScore(b);
  if (scoreA !== scoreB) return scoreB - scoreA;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}