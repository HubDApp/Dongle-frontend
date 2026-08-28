"use client";

import React from "react";
import { Star } from "lucide-react";

export type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

interface RatingDistributionSummaryProps {
  distribution: RatingDistribution;
  totalReviews: number;
  averageRating: number;
  className?: string;
}

export function computeRatingDistribution(
  reviews: { rating: number }[],
): RatingDistribution {
  const dist: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) {
      dist[r.rating as keyof RatingDistribution]++;
    }
  });
  return dist;
}

export function RatingDistributionSummary({
  distribution,
  totalReviews,
  averageRating,
  className = "",
}: RatingDistributionSummaryProps) {
  if (totalReviews === 0) {
    return (
      <div
        className={`p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center ${className}`}
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No reviews yet — rating distribution will appear once users leave feedback.
        </p>
      </div>
    );
  }

  const displayRating = Number.isFinite(averageRating)
    ? averageRating.toFixed(1)
    : "0.0";

  return (
    <div
      className={`p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-8 items-center ${className}`}
    >
      <div className="text-center md:text-left">
        <div className="text-5xl font-black mb-1">{displayRating}</div>
        <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= Math.round(averageRating)
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-zinc-300 dark:text-zinc-700"
              }`}
            />
          ))}
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          {totalReviews} total review{totalReviews !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="flex-1 w-full max-w-sm space-y-2">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = distribution[star];
          const percentage =
            totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <div className="w-12 text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                {star} <Star className="w-3 h-3" />
              </div>
              <div className="flex-1 h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${star} star ratings: ${percentage}%`}
                />
              </div>
              <div className="w-16 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">
                {count} ({percentage}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
