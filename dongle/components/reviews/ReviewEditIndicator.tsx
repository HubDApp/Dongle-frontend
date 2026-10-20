"use client";

import React, { useState } from "react";
import { History } from "lucide-react";
import { ReviewEditHistoryModal } from "./ReviewEditHistoryModal";
import type { ReviewEditEntry } from "@/types/review-edit-history";

interface ReviewEditIndicatorProps {
  reviewId: string;
  originalComment: string;
  edits: ReviewEditEntry[];
  className?: string;
}

/**
 * "Edited" indicator shown on modified reviews (#681).
 * Clicking opens the edit history modal.
 */
export function ReviewEditIndicator({
  reviewId,
  originalComment,
  edits,
  className,
}: ReviewEditIndicatorProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowHistory(true)}
        className={`inline-flex items-center gap-1 text-xs text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline dark:text-gray-400 dark:hover:text-gray-200 ${className ?? ""}`}
        aria-label={`View edit history (${edits.length} edit${edits.length === 1 ? "" : "s"})`}
      >
        <History className="h-3 w-3" />
        Edited{edits.length > 1 ? ` (${edits.length}x)` : ""}
      </button>

      <ReviewEditHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        reviewId={reviewId}
        originalComment={originalComment}
        edits={edits}
      />
    </>
  );
}
