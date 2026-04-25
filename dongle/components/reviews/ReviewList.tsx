"use client";

import { Review } from "@/types/review";

interface ReviewListProps {
  reviews: Review[];
  currentUserAddress: string | null;
  onEdit: (review: Review) => void;
  onDelete: (id: string) => void;
}

export default function ReviewList({ reviews, currentUserAddress, onEdit, onDelete }: ReviewListProps) {
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
                  {review.userAddress.substring(0, 6)}...{review.userAddress.substring(review.userAddress.length - 4)}
                  {currentUserAddress === review.userAddress && (
                    <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full uppercase">You</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
              <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-bold text-yellow-700 dark:text-yellow-500">{review.rating}</span>
            </div>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
            {review.comment}
          </p>

          <div className="flex justify-between items-center">
            <div className="text-xs font-medium text-blue-500 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded">
              {review.projectName}
            </div>
            
            {currentUserAddress === review.userAddress && (
              <div className="flex gap-2">
                <button 
                  onClick={() => onEdit(review)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-black dark:hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={() => onDelete(review.id)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-zinc-500 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
