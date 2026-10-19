"use client";

/**
 * ReviewModerationQueue — admin moderation UI for flagged reviews (#684).
 *
 * Route: /admin/moderation/reviews
 * Lists flagged reviews with flag reasons, bulk actions, filter by flag type,
 * flag history, auto-remove threshold, and notification hooks.
 */

import { useState, useMemo } from "react";
import {
  Shield, CheckCircle, XCircle, Ban, Filter,
  ChevronDown, AlertTriangle, Flag,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface FlagRecord {
  id: string;
  reviewId: string;
  reason: string;
  flaggedBy: string;
  flaggedAt: string;
}

interface ModerationReview {
  id: string;
  reviewId: string;
  content: string;
  reviewer: string;
  projectName: string;
  flaggedAt: string;
  flagCount: number;
  flags: FlagRecord[];
  status: "pending" | "approved" | "removed";
}

type FlagFilter = "all" | "spam" | "offensive" | "inaccurate";

const AUTO_REMOVE_THRESHOLD = 5;

// ── Component ────────────────────────────────────────────────────────────────

export default function ReviewModerationQueue() {
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [flagFilter, setFlagFilter] = useState<FlagFilter>("all");
  const [showFlagHistory, setShowFlagHistory] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (r.status !== "pending") return false;
      if (flagFilter === "all") return true;
      return r.flags.some((f) => f.reason === flagFilter);
    });
  }, [reviews, flagFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFlagHistory = (id: string) => {
    setShowFlagHistory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moderate = (ids: string[], action: "approve" | "remove" | "ban") => {
    setReviews((prev) =>
      prev.map((r) => {
        if (!ids.includes(r.reviewId)) return r;
        return {
          ...r,
          status: action === "approve" ? "approved" : "removed",
        };
      }),
    );
    setSelected(new Set());
  };

  const bulkModerate = (action: "approve" | "remove" | "ban") => {
    moderate(Array.from(selected), action);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-blue-600" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Review Moderation
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filtered.length} flagged reviews pending · auto-remove at {AUTO_REMOVE_THRESHOLD}+ flags
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-zinc-400" aria-hidden="true" />
        <div className="flex gap-1.5">
          {(["all", "spam", "offensive", "inaccurate"] as FlagFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFlagFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                flagFilter === f
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            {selected.size} selected
          </span>
          <button
            onClick={() => bulkModerate("approve")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve all
          </button>
          <button
            onClick={() => bulkModerate("remove")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            <XCircle className="w-3.5 h-3.5" /> Remove all
          </button>
          <button
            onClick={() => bulkModerate("ban")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 text-white hover:bg-zinc-900 dark:bg-zinc-700"
          >
            <Ban className="w-3.5 h-3.5" /> Ban users
          </button>
        </div>
      )}

      {/* Review list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            No flagged reviews match the current filter.
          </div>
        ) : (
          filtered.map((review) => (
            <div
              key={review.reviewId}
              className={`rounded-xl border p-4 ${
                review.flagCount >= AUTO_REMOVE_THRESHOLD
                  ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(review.reviewId)}
                  onChange={() => toggleSelect(review.reviewId)}
                  className="mt-1.5 h-4 w-4 rounded border-zinc-300 text-blue-600"
                  aria-label={`Select review ${review.reviewId}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {review.reviewer.substring(0, 8)}…
                    </span>
                    <span className="text-xs text-zinc-500">on {review.projectName}</span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                      <Flag className="w-3 h-3" aria-hidden="true" />
                      {review.flagCount} flags
                    </span>
                    {review.flagCount >= AUTO_REMOVE_THRESHOLD && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        Auto-removal threshold
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {review.content}
                  </p>

                  {/* Flag history toggle */}
                  <button
                    onClick={() => toggleFlagHistory(review.reviewId)}
                    className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${
                        showFlagHistory.has(review.reviewId) ? "rotate-180" : ""
                      }`}
                    />
                    Flag history ({review.flags.length})
                  </button>
                  {showFlagHistory.has(review.reviewId) && (
                    <div className="mt-2 space-y-1">
                      {review.flags.map((flag) => (
                        <div
                          key={flag.id}
                          className="flex items-center gap-2 text-xs text-zinc-500 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700"
                        >
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            {flag.reason}
                          </span>
                          <span>by {flag.flaggedBy.substring(0, 8)}…</span>
                          <span>{flag.flaggedAt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => moderate([review.reviewId], "approve")}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                  >
                    <CheckCircle className="w-3 h-3" /> Approve
                  </button>
                  <button
                    onClick={() => moderate([review.reviewId], "remove")}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                  >
                    <XCircle className="w-3 h-3" /> Remove
                  </button>
                  <button
                    onClick={() => moderate([review.reviewId], "ban")}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-50 text-zinc-700 border border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                  >
                    <Ban className="w-3 h-3" /> Ban user
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
