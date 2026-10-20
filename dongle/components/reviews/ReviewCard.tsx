"use client";

/**
 * ReviewCard — individual review with featured badge support (#682).
 *
 * Extends ReviewList's inline card with a "Featured" badge, admin feature
 * button, and featured-first ordering. Featured reviews show a ⭐ badge.
 */

import { Star, ThumbsUp, ThumbsDown, Flag, Pencil, Trash2, Sparkles, Lock } from "lucide-react";
import { Review } from "@/types/review";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { formatDate } from "@/lib/date";
import { IconButton } from "@/components/ui/IconButton";
import { ENCRYPTED_COMMENT_SENTINEL } from "@/lib/review-encryption";

interface ReviewCardProps {
  review: Review;
  currentUserAddress: string | null;
  isAdmin?: boolean;
  onEdit?: (review: Review) => void;
  onDelete?: (id: string) => void;
  onVoteHelpful?: (id: string) => void;
  onVoteUnhelpful?: (id: string) => void;
  onReport?: (review: Review) => void;
  onFeature?: (id: string) => void;
  onUnfeature?: (id: string) => void;
}

export default function ReviewCard({
  review,
  currentUserAddress,
  isAdmin = false,
  onEdit,
  onDelete,
  onVoteHelpful,
  onVoteUnhelpful,
  onReport,
  onFeature,
  onUnfeature,
}: ReviewCardProps) {
  return (
    <div
      className={`bg-white dark:bg-zinc-900 border p-6 rounded-3xl transition-all ${
        review.featured
          ? "border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {review.userAddress.substring(0, 1)}
          </div>
          <div>
            <div className="font-bold flex items-center gap-2">
              <AddressDisplay address={review.userAddress} copyable truncated inline />
              {currentUserAddress === review.userAddress && (
                <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full uppercase">You</span>
              )}
              {review.featured && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  Featured
                </span>
              )}
              {review.encrypted && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold"
                  title="This review is end-to-end encrypted"
                >
                  <Lock className="w-3 h-3" aria-hidden="true" />
                  Encrypted
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500">{formatDate(review.createdAt, "relative")}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" aria-hidden="true" />
          <span className="text-sm font-bold text-yellow-700 dark:text-yellow-500">{review.rating}</span>
        </div>
      </div>

      {review.encrypted ? (
        <div className="flex items-center gap-2 mb-6 text-sm text-indigo-600 dark:text-indigo-400 italic">
          <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{ENCRYPTED_COMMENT_SENTINEL}</span>
        </div>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">{review.comment}</p>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-blue-500 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded">
            {review.projectName}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onVoteHelpful?.(review.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-400"
              aria-label={`Mark as helpful, current count ${review.helpfulVotes?.length || 0}`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>{review.helpfulVotes?.length || 0}</span>
            </button>
            <button
              onClick={() => onVoteUnhelpful?.(review.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-400"
              aria-label={`Mark as unhelpful, current count ${review.unhelpfulVotes?.length || 0}`}
            >
              <ThumbsDown className="w-3 h-3" />
              <span>{review.unhelpfulVotes?.length || 0}</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {isAdmin && onFeature && !review.featured && (
            <button
              onClick={() => onFeature(review.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
            >
              ⭐ Feature this review
            </button>
          )}
          {isAdmin && onUnfeature && review.featured && (
            <button
              onClick={() => onUnfeature(review.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
            >
              Revoke featured
            </button>
          )}
          {currentUserAddress === review.userAddress ? (
            <>
              <IconButton onClick={() => onEdit?.(review)} aria-label="Edit review" variant="default" size="sm">
                <Pencil className="w-4 h-4" />
              </IconButton>
              <IconButton onClick={() => onDelete?.(review.id)} aria-label="Delete review" variant="error" size="sm">
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </>
          ) : (
            currentUserAddress && onReport && (
              <IconButton onClick={() => onReport(review)} aria-label="Report review" variant="ghost" size="sm">
                <Flag className="w-4 h-4 text-zinc-400 hover:text-red-500" />
              </IconButton>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Sort reviews: featured first, then by date descending (#682).
 */
export function sortReviewsFeaturedFirst(reviews: Review[]): Review[] {
  return [...reviews].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Check if a project has reached the featured review limit (#682).
 */
export function hasReachedFeaturedLimit(reviews: Review[]): boolean {
  return reviews.filter((r) => r.featured).length >= 3;
}
