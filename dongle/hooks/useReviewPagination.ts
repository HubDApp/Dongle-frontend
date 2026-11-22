"use client";

/**
 * useReviewPagination
 *
 * Manages paginated review display with:
 * - URL ?page=N sync (read on mount, write on change)
 * - "Load more" mode (append batches) vs standard page mode
 * - Infinite scroll via IntersectionObserver
 * - Scroll position restoration on back-navigation
 *
 * The hook only knows about indices — it does not fetch data itself.
 * The caller slices its already-sorted array with the returned window.
 *
 * @example
 *   const { visibleReviews, ...controls } = useReviewPagination(sortedReviews);
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { REVIEWS_PAGE_SIZE } from "@/constants/limits";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaginationMode = "paginated" | "load-more" | "infinite";

export interface UseReviewPaginationOptions {
  /** Number of reviews per page / batch. Defaults to REVIEWS_PAGE_SIZE (20). */
  pageSize?: number;
}

export interface UseReviewPaginationReturn<T> {
  /** The slice of items to render right now. */
  visibleReviews: T[];
  /** 1-based current page number. */
  currentPage: number;
  /** Total number of pages given the full list length. */
  totalPages: number;
  /** Total number of items in the full list. */
  totalCount: number;
  /** True while appending the next batch (infinite / load-more). */
  isLoadingMore: boolean;
  /** Current display mode. */
  mode: PaginationMode;
  /** Navigate to an absolute page number. Resets scroll to top in paginated mode. */
  goToPage: (page: number) => void;
  /** Navigate to the next page / load next batch. */
  goToNextPage: () => void;
  /** Navigate to the previous page (paginated mode only). */
  goToPrevPage: () => void;
  /** Whether there are more items beyond the current view. */
  hasNextPage: boolean;
  /** Whether there is a previous page (paginated mode only). */
  hasPrevPage: boolean;
  /** Toggle between paginated and load-more modes. Persisted to localStorage. */
  setMode: (mode: PaginationMode) => void;
  /**
   * Ref to attach to the last visible review card.
   * When infinite mode is active the observer fires goToNextPage automatically.
   */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

const MODE_STORAGE_KEY = "dongle_reviews_pagination_mode";
const SCROLL_STORAGE_KEY = "dongle_reviews_scroll_position";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReviewPagination<T>(
  items: T[],
  options: UseReviewPaginationOptions = {},
): UseReviewPaginationReturn<T> {
  const pageSize = options.pageSize ?? REVIEWS_PAGE_SIZE;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Mode (persisted preference) ──────────────────────────────────────────

  const [mode, setModeState] = useState<PaginationMode>(() => {
    if (typeof window === "undefined") return "paginated";
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "load-more" || stored === "infinite" || stored === "paginated") {
      return stored;
    }
    return "paginated";
  });

  const setMode = useCallback((next: PaginationMode) => {
    setModeState(next);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch { /* storage unavailable */ }
  }, []);

  // ── Current page ─────────────────────────────────────────────────────────

  // In paginated mode, page is tracked in the URL (?page=N).
  // In load-more / infinite mode, page is local state (tracks how many
  // batches have been loaded, URL stays at ?page=1).

  const urlPage = useMemo(() => {
    const raw = searchParams.get("page");
    const parsed = parseInt(raw ?? "1", 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  }, [searchParams]);

  const [loadMorePage, setLoadMorePage] = useState(urlPage);

  // Reset load-more page when switching modes or when items list changes length.
  const prevItemsLength = useRef(items.length);
  useEffect(() => {
    if (items.length !== prevItemsLength.current) {
      prevItemsLength.current = items.length;
      setLoadMorePage(1);
    }
  }, [items.length]);

  useEffect(() => {
    if (mode === "paginated") {
      setLoadMorePage(1);
    }
  }, [mode]);

  const currentPage = mode === "paginated" ? urlPage : loadMorePage;

  // ── Derived values ────────────────────────────────────────────────────────

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const visibleReviews = useMemo(() => {
    if (mode === "paginated") {
      const start = (currentPage - 1) * pageSize;
      return items.slice(start, start + pageSize);
    }
    // load-more / infinite: show all batches up to and including currentPage
    return items.slice(0, currentPage * pageSize);
  }, [items, mode, currentPage, pageSize]);

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // ── Loading state (cosmetic delay for load-more / infinite) ──────────────

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ── Navigation ────────────────────────────────────────────────────────────

  const pushPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page === 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(totalPages, page));
      if (mode === "paginated") {
        pushPage(clamped);
        // Scroll to the reviews section heading rather than the page top
        // so the user doesn't lose the filter controls.
        requestAnimationFrame(() => {
          document
            .getElementById("reviews-section")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else {
        setLoadMorePage(clamped);
      }
    },
    [mode, totalPages, pushPage],
  );

  const goToNextPage = useCallback(() => {
    if (!hasNextPage) return;
    if (mode === "paginated") {
      goToPage(currentPage + 1);
    } else {
      // Brief loading state so the spinner is visible before paint.
      setIsLoadingMore(true);
      setTimeout(() => {
        setLoadMorePage((p) => Math.min(p + 1, totalPages));
        setIsLoadingMore(false);
      }, 150);
    }
  }, [hasNextPage, mode, currentPage, goToPage, totalPages]);

  const goToPrevPage = useCallback(() => {
    if (!hasPrevPage) return;
    goToPage(currentPage - 1);
  }, [hasPrevPage, currentPage, goToPage]);

  // ── Scroll-position restoration ───────────────────────────────────────────

  // On mount: restore scroll position (supports browser back-navigation).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (stored) {
      const y = parseInt(stored, 10);
      if (Number.isFinite(y) && y > 0) {
        requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
      }
      sessionStorage.removeItem(SCROLL_STORAGE_KEY);
    }
  }, []);

  // Save scroll position before the user navigates away.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const save = () => {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
    };
    window.addEventListener("beforeunload", save);
    return () => window.removeEventListener("beforeunload", save);
  }, []);

  // ── Infinite scroll sentinel ─────────────────────────────────────────────

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mode !== "infinite") return;
    if (!sentinelRef.current) return;
    if (!hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          goToNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [mode, hasNextPage, goToNextPage, visibleReviews.length]);

  return {
    visibleReviews,
    currentPage,
    totalPages,
    totalCount,
    isLoadingMore,
    mode,
    goToPage,
    goToNextPage,
    goToPrevPage,
    hasNextPage,
    hasPrevPage,
    setMode,
    sentinelRef,
  };
}
