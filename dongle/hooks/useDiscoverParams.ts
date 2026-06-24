"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export type SortBy = "rating" | "newest" | "popular";

export interface DiscoverParams {
  /** The raw (unDebounced) value shown in the search input */
  searchInput: string;
  /** The debounced value used for filtering — lags searchInput by DEBOUNCE_MS */
  searchQuery: string;
  category: string;
  sortBy: SortBy;
  page: number;
}

export interface DiscoverParamsActions {
  setSearchInput: (value: string) => void;
  setCategory: (value: string) => void;
  setSortBy: (value: SortBy) => void;
  loadNextPage: () => void;
  clearFilters: () => void;
}

const DEBOUNCE_MS = 300;
const VALID_SORTS: SortBy[] = ["rating", "newest", "popular"];

function parseSort(raw: string | null): SortBy {
  return VALID_SORTS.includes(raw as SortBy) ? (raw as SortBy) : "rating";
}

function parsePage(raw: string | null): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Reads and writes Discover filter state (search, category, sort, page) to
 * the URL's query string so that filtered views can be shared, bookmarked,
 * and navigated with the browser's back/forward buttons.
 *
 * Search input is debounced: the `<input>` value updates immediately
 * (searchInput) while the URL param and the filter query (searchQuery)
 * only update after DEBOUNCE_MS ms of idle typing.
 */
export function useDiscoverParams(): DiscoverParams & DiscoverParamsActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial values from URL once
  const urlQuery = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("category") ?? "All";
  const urlSort = parseSort(searchParams.get("sort"));
  const urlPage = parsePage(searchParams.get("page"));

  // searchInput tracks the live <input> value; searchQuery is the debounced URL value
  const [searchInput, setSearchInputState] = useState(urlQuery);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whenever the URL changes from external navigation (back/forward), resync local state
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    // Browser back/forward should resync the controlled search field with the URL.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional URL-to-input sync
    setSearchInputState(q);
    setSearchQuery(q);
  }, [searchParams]);

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Push a new URL with the supplied params merged on top of the current ones */
  const pushParams = useCallback(
    (updates: Partial<Record<"q" | "category" | "sort" | "page", string>>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === "" || value === "All" || value === "rating" || value === "1") {
          // Clean up default values to keep URLs short
          if (
            (key === "q" && value === "") ||
            (key === "category" && value === "All") ||
            (key === "sort" && value === "rating") ||
            (key === "page" && value === "1")
          ) {
            params.delete(key);
          } else {
            params.set(key, value);
          }
        } else {
          params.set(key, value);
        }
      }

      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  // ── actions ────────────────────────────────────────────────────────────────

  const setSearchInput = useCallback(
    (value: string) => {
      setSearchInputState(value);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setSearchQuery(value);
        pushParams({ q: value, page: "1" });
      }, DEBOUNCE_MS);
    },
    [pushParams],
  );

  const setCategory = useCallback(
    (value: string) => {
      pushParams({ category: value, page: "1" });
    },
    [pushParams],
  );

  const setSortBy = useCallback(
    (value: SortBy) => {
      pushParams({ sort: value, page: "1" });
    },
    [pushParams],
  );

  const loadNextPage = useCallback(() => {
    pushParams({ page: String(urlPage + 1) });
  }, [pushParams, urlPage]);

  const clearFilters = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSearchInputState("");
    setSearchQuery("");
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return {
    searchInput,
    searchQuery,
    category: urlCategory,
    sortBy: urlSort,
    page: urlPage,
    setSearchInput,
    setCategory,
    setSortBy,
    loadNextPage,
    clearFilters,
  };
}
