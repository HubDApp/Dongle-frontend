"use client";

import React from "react";
import { X, History, Plus, Minus } from "lucide-react";
import type { ReviewEditEntry } from "@/types/review-edit-history";
import { computeDiff } from "@/types/review-edit-history";

interface ReviewEditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewId: string;
  originalComment: string;
  edits: ReviewEditEntry[];
}

/**
 * Modal showing the edit history of a review (#681).
 * Displays timestamp, reviewer, and word-level diffs for each edit.
 */
export function ReviewEditHistoryModal({
  isOpen,
  onClose,
  reviewId,
  originalComment,
  edits,
}: ReviewEditHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit history for review ${reviewId}`}
    >
      <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <History className="h-5 w-5" />
            Edit History
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close edit history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Original version */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Original Version
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{originalComment}</p>
        </div>

        {/* Edit entries */}
        <div className="space-y-3">
          {edits.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This review has not been edited.
            </p>
          ) : (
            edits.map((edit) => {
              const diff = computeDiff(edit.previousComment, edit.newComment);
              return (
                <div
                  key={edit.id}
                  className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      Edit #{edit.editNumber} · {new Date(edit.editedAt).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {edit.reviewerAddress.slice(0, 6)}...{edit.reviewerAddress.slice(-4)}
                    </span>
                  </div>

                  {/* Diff view */}
                  <div className="space-y-1">
                    {diff.added.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <Plus className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                        <span className="text-sm text-green-700 dark:text-green-400">
                          {diff.added.join(", ")}
                        </span>
                      </div>
                    )}
                    {diff.removed.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <Minus className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                        <span className="text-sm text-red-700 dark:text-red-400">
                          {diff.removed.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* New comment */}
                  <div className="mt-2 rounded bg-gray-50 p-2 dark:bg-gray-800">
                    <div className="text-xs text-gray-500">Result:</div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {edit.newComment}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
