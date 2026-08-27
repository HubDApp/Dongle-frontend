"use client";
import AddressDisplay from "@/components/ui/AddressDisplay";

import React, { useState, useEffect, useRef } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { cn } from "@/lib/utils";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";
import { Review, REVIEW_REPORT_REASONS, REVIEW_REPORT_CONSTRAINTS } from "@/types/review";

interface ReportReviewModalProps {
  isOpen: boolean;
  review: Review;
  onClose: () => void;
  onSubmit: (data: { reason: string; explanation: string }) => void;
}

export function ReportReviewModal({
  isOpen,
  review,
  onClose,
  onSubmit,
}: ReportReviewModalProps) {
  const [reason, setReason] = useState("");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLSelectElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (!isOpen) return;
    // Schedule resets as a microtask so they run after render,
    // avoiding synchronous setState-in-effect lint violations.
    const id = setTimeout(() => {
      setReason("");
      setExplanation("");
      setError("");
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Handle escape key
  useModalFocusTrap(isOpen, dialogRef, initialFocusRef, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError("Please select a reason for reporting.");
      return;
    }
    onSubmit({ reason, explanation });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-review-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-md bg-white dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl",
          "p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
        )}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-red-100 dark:bg-red-900/30">
          <Flag className="w-6 h-6 text-red-500" aria-hidden="true" />
        </div>

        <h2 id="report-review-dialog-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Report Review
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          Report this review by{" "}
          <span className="font-mono text-zinc-700 dark:text-zinc-300">
            {review.userAddress.substring(0, 6)}...
          </span>
          . Your report will be reviewed by our moderation team.
        </p>

        <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-500 font-bold">{review.rating}/5</span>
            <span className="text-xs text-zinc-500">â€¢</span>
            <span className="text-xs text-zinc-500">{review.projectName}</span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
            {review.comment}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField
            ref={initialFocusRef}
            label="Reason for reporting"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            options={REVIEW_REPORT_REASONS}
            error={error}
          />

          <TextAreaField
            label="Additional explanation (optional)"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Provide any additional context..."
            maxLength={REVIEW_REPORT_CONSTRAINTS.EXPLANATION_MAX_LENGTH}
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="error">
              Submit Report
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


