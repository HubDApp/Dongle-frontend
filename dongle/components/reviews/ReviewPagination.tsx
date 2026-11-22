"use client";

/**
 * ReviewPagination
 *
 * Renders the full pagination footer below a review list:
 *
 *   • "Load more" button (load-more mode)
 *   • Previous / Next buttons with current-page indicator (paginated mode)
 *   • "Jump to page" input (shown when totalPages ≥ REVIEWS_JUMP_THRESHOLD pages)
 *   • Mode toggle: Paginated | Load more | Infinite scroll
 *   • Total review count + current range
 *   • Loading spinner while next batch is fetching
 *
 * This component is presentation-only. All state lives in useReviewPagination.
 */

import { useId, useRef } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import type { PaginationMode } from "@/hooks/useReviewPagination";
import { REVIEWS_JUMP_THRESHOLD, REVIEWS_PAGE_SIZE } from "@/constants/limits";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReviewPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isLoadingMore: boolean;
  mode: PaginationMode;
  onNextPage: () => void;
  onPrevPage: () => void;
  onGoToPage: (page: number) => void;
  onSetMode: (mode: PaginationMode) => void;
  /** Ref forwarded to the invisible sentinel div (infinite scroll trigger). */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModeToggle({
  mode,
  onSetMode,
}: {
  mode: PaginationMode;
  onSetMode: (m: PaginationMode) => void;
}) {
  const options: { value: PaginationMode; label: string }[] = [
    { value: "paginated", label: "Pages" },
    { value: "load-more", label: "Load more" },
    { value: "infinite", label: "Infinite scroll" },
  ];

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800/50"
      role="group"
      aria-label="Review display mode"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSetMode(opt.value)}
          aria-pressed={mode === opt.value}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
            mode === opt.value
              ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function JumpToPage({
  currentPage,
  totalPages,
  onGoToPage,
}: {
  currentPage: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputRef.current?.value ?? "", 10);
    if (Number.isFinite(val)) {
      onGoToPage(val);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2"
      aria-label="Jump to page"
    >
      <label
        htmlFor={inputId}
        className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap"
      >
        Go to page
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="number"
        min={1}
        max={totalPages}
        defaultValue=""
        placeholder={String(currentPage)}
        aria-label={`Jump to page, 1 to ${totalPages}`}
        className="w-16 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      <button
        type="submit"
        className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      >
        Go
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReviewPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize = REVIEWS_PAGE_SIZE,
  hasNextPage,
  hasPrevPage,
  isLoadingMore,
  mode,
  onNextPage,
  onPrevPage,
  onGoToPage,
  onSetMode,
  sentinelRef,
}: ReviewPaginationProps) {
  if (totalCount === 0) return null;

  // Range text: "Showing 21–40 of 83 reviews"
  const rangeStart =
    mode === "paginated" ? (currentPage - 1) * pageSize + 1 : 1;
  const rangeEnd =
    mode === "paginated"
      ? Math.min(currentPage * pageSize, totalCount)
      : Math.min(currentPage * pageSize, totalCount);

  const rangeLabel =
    totalCount <= pageSize
      ? `${totalCount} review${totalCount !== 1 ? "s" : ""}`
      : `Showing ${rangeStart}–${rangeEnd} of ${totalCount} reviews`;

  return (
    <div className="mt-6 space-y-4" aria-label="Review pagination">
      {/* Infinite scroll sentinel — invisible, observed by IntersectionObserver */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* Loading spinner (load-more / infinite mode) */}
      {isLoadingMore && (
        <div
          role="status"
          aria-label="Loading more reviews"
          className="flex justify-center py-4"
        >
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" aria-hidden="true" />
          <span className="sr-only">Loading more reviews…</span>
        </div>
      )}

      {/* Load-more button */}
      {mode === "load-more" && hasNextPage && !isLoadingMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onNextPage}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
            aria-label={`Load next ${pageSize} reviews`}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Load more reviews
          </button>
        </div>
      )}

      {/* Paginated nav row */}
      {mode === "paginated" && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={!hasPrevPage}
            aria-label="Previous page"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-zinc-50 dark:hover:enabled:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </button>

          <span
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums"
          >
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={onNextPage}
            disabled={!hasNextPage}
            aria-label="Next page"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-zinc-50 dark:hover:enabled:bg-zinc-800 transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Count + mode toggle + jump-to-page — always visible when there are reviews */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
        <p
          className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {rangeLabel}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {/* Jump to page — only when there are many pages */}
          {mode === "paginated" && totalPages >= REVIEWS_JUMP_THRESHOLD && (
            <JumpToPage
              currentPage={currentPage}
              totalPages={totalPages}
              onGoToPage={onGoToPage}
            />
          )}

          <ModeToggle mode={mode} onSetMode={onSetMode} />
        </div>
      </div>
    </div>
  );
}
