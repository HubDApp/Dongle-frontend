"use client";

import { Review } from "@/types/review";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { formatDate } from "@/lib/date";
import { Star, Pencil, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

interface ReviewListProps {
  reviews: Review[];
  currentUserAddress: string | null;
  onEdit: (review: Review) => void;
  onDelete: (id: string) => void;
  onVoteHelpful?: (id: string) => void;
  onVoteUnhelpful?: (id: string) => void;
}

export default function ReviewList({ 
  reviews, 
  currentUserAddress, 
  onEdit, 
  onDelete,
  onVoteHelpful,
  onVoteUnhelpful
}: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
        <p className="text-zinc-500">No reviews yet. Be the first to leave one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div 
          key={review.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {review.userAddress.substring(0, 1)}
              </div>
              <div>
                <div className="font-bold flex items-center gap-2">
                  <AddressDisplay address={review.userAddress} copyable={true} truncated={true} inline={true} />
                  {currentUserAddress === review.userAddress && (
                    <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full uppercase">You</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  {formatDate(review.createdAt, "relative")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-bold text-yellow-700 dark:text-yellow-500">{review.rating}</span>
            </div>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
            {review.comment}
          </p>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-xs font-medium text-blue-500 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded">
                {review.projectName}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onVoteHelpful?.(review.id)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all border ${
                    review.helpfulVotes?.includes(currentUserAddress || "")
                      ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-500"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-black dark:bg-zinc-800 dark:border-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
                  }`}
                  aria-label={`Mark as helpful, current count ${review.helpfulVotes?.length || 0}`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{review.helpfulVotes?.length || 0}</span>
                </button>

                <button
                  onClick={() => onVoteUnhelpful?.(review.id)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all border ${
                    review.unhelpfulVotes?.includes(currentUserAddress || "")
                      ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-500"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-black dark:bg-zinc-800 dark:border-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
                  }`}
                  aria-label={`Mark as unhelpful, current count ${review.unhelpfulVotes?.length || 0}`}
                >
                  <ThumbsDown className="w-3 h-3" />
                  <span>{review.unhelpfulVotes?.length || 0}</span>
                </button>
              </div>
            </div>
            
            {currentUserAddress === review.userAddress && (
              <div className="flex gap-2">
                <IconButton
                  onClick={() => onEdit(review)}
                  aria-label="Edit review"
                  variant="default"
                  size="sm"
                >
                  <Pencil className="w-4 h-4" />
                </IconButton>
                <IconButton
                  onClick={() => onDelete(review.id)}
                  aria-label="Delete review"
                  variant="error"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
