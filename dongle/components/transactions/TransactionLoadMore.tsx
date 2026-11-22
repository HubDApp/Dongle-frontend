"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  hasMore: boolean;
  loadingMore: boolean;
  error: string | null;
  onLoadMore: () => void;
}

const INFINITE_KEY = "dongle_tx_infinite_scroll";

/** "Load more" footer for paginated wallet history, with optional infinite scroll (issue #872). */
export function TransactionLoadMore({ hasMore, loadingMore, error, onLoadMore }: Props) {
  const [infinite, setInfinite] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setInfinite(localStorage.getItem(INFINITE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!infinite || !hasMore || error || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && onLoadMore(),
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [infinite, hasMore, error, onLoadMore]);

  const toggleInfinite = (on: boolean) => {
    setInfinite(on);
    try {
      localStorage.setItem(INFINITE_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <div ref={sentinelRef} aria-hidden="true" />
      {error ? (
        <div role="alert" className="flex w-full items-center justify-between gap-3 rounded-2xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <span>{error}</span>
          <button onClick={onLoadMore} className="shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      ) : hasMore ? (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          aria-busy={loadingMore}
          className="flex items-center gap-2 rounded-full border border-zinc-200 px-5 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {loadingMore && <Spinner size="sm" />}
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      ) : (
        <button disabled className="rounded-full px-5 py-2 text-sm text-zinc-500">
          All transactions loaded
        </button>
      )}
      {hasMore && (
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={infinite} onChange={(e) => toggleInfinite(e.target.checked)} />
          Load automatically while scrolling
        </label>
      )}
    </div>
  );
}

export default TransactionLoadMore;
