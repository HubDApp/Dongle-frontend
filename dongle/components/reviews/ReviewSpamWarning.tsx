"use client";

import { assessReviewSpam } from "@/utils/review-spam.util";

interface ReviewSpamWarningProps {
  comment: string;
  dailyReviewCount?: number;
}

export function ReviewSpamWarning({ comment, dailyReviewCount = 0 }: ReviewSpamWarningProps) {
  if (!comment.trim()) return null;

  const { flags, riskScore } = assessReviewSpam(comment, dailyReviewCount);
  if (riskScore < 20) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm"
    >
      <p className="font-medium text-amber-800 dark:text-amber-200">
        Quality check — risk score {riskScore}/100
      </p>
      {flags.length > 0 && (
        <ul className="mt-1 list-disc list-inside text-amber-700 dark:text-amber-300">
          {flags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
