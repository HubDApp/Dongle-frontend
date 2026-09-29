"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export type SortBy = "rating" | "newest" | "popular";

export interface DiscoverParams {
  /** The raw (unDebounced) value shown in the search input */
  searchInput: string;
  /** The debounced value used for filtering — lags searchInput by DEBOUNCE_MS */
  searchQuery: string;
  /** @deprecated Use `categories` instead — kept for backward compat */
  category: string;
  categories: string[];
  tags: string[];
  sortBy: SortBy;
  page: number;
}

export interface DiscoverParamsActions {
  setSearchInput: (value: string) => void;
  /** @deprecated Use `toggleCategory` instead — kept for backward compat */
  setCategory: (value: string) => void;
  toggleCategory: (value: string) => void;
  setCategories: (values: string[]) => void;
  setTags: (tags: string[]) => void;
  setSortBy: (value: SortBy) => void;
  loadNextPage: () => void;
  clearFilters: () => void;
}

const DEBOUNCE_MS = 300;
const VALID_SORTS: SortBy[] = ["rating", "newest", "popular"];
const ALL_CATEGORIES_SENTINEL = "All";

function parseSort(raw: string | null): SortBy {
  return VALID_SORTS.includes(raw as SortBy) ? (raw as SortBy) : "rating";
}

function parsePage(raw: string | null): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
}

function parseCategories(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
}

/**
 * Reads and writes Discover filter state (search, categories, tags, sort, page)
 * to the URL's query string so that filtered views can be shared, bookmarked,
 * and navigated with the browser's back/forward buttons.
 *
 * Search input is debounced: the `<input>` value updates immediately
 * (searchInput) while the URL param and the filter query (searchQuery)
 * only update after DEBOUNCE_MS ms of idle typing.
 *
 * Categories support multi-select: multiple categories can be active at once.
 * A categories param of `""` (absent) means "All categories" — no filtering.
 */
export function useDiscoverParams(): DiscoverParams & DiscoverParamsActions {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const legacyCategory = searchParams.get("category") ?? ALL_CATEGORIES_SENTINEL;
  const urlCategories = parseCategories(searchParams.get("categories"));
  const urlTags = parseTags(searchParams.get("tags"));
  const urlSort = parseSort(searchParams.get("sort"));
  const urlPage = parsePage(searchParams.get("page"));

  const initialCategories =
    urlCategories.length > 0
      ? urlCategories
      : legacyCategory !== ALL_CATEGORIES_SENTINEL
        ? [legacyCategory]
        : [];

  const [searchInput, setSearchInputState] = useState(urlQuery);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [categories, setCategoriesState] = useState<string[]>(initialCategories);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const cats = parseCategories(searchParams.get("categories"));
    const legacy = searchParams.get("category") ?? ALL_CATEGORIES_SENTINEL;

    const resolvedCats =
      cats.length > 0 ? cats : legacy !== ALL_CATEGORIES_SENTINEL ? [legacy] : [];

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional URL-to-local sync
    setSearchInputState(q);
    setSearchQuery(q);
    setCategoriesState(resolvedCats);
  }, [searchParams]);

  // ── helpers ────────────────────────────────────────────────────────────────

  const pushParams = useCallback(
    (
      updates: Partial<
        Record<"q" | "categories" | "tags" | "sort" | "page", string>
      >,
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("category");

      for (const [key, value] of Object.entries(updates)) {
        const isEmpty =
          value === "" ||
          value === "rating" ||
          value === "1";

        if (isEmpty) {
          if (
            (key === "q" && value === "") ||
            (key === "categories" && value === "") ||
            (key === "tags" && value === "") ||
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
      const next = value === ALL_CATEGORIES_SENTINEL ? [] : [value];
      setCategoriesState(next);
      pushParams({ categories: next.join(","), page: "1" });
    },
    [pushParams],
  );

  const toggleCategory = useCallback(
    (value: string) => {
      if (value === ALL_CATEGORIES_SENTINEL) {
        setCategoriesState([]);
        pushParams({ categories: "", page: "1" });
        return;
      }
      setCategoriesState((prev) => {
        const has = prev.includes(value);
        const next = has ? prev.filter((c) => c !== value) : [...prev, value];
        pushParams({ categories: next.join(","), page: "1" });
        return next;
      });
    },
    [pushParams],
  );

  const setCategories = useCallback(
    (values: string[]) => {
      setCategoriesState(values);
      pushParams({ categories: values.join(","), page: "1" });
    },
    [pushParams],
  );

  const setTags = useCallback(
    (tags: string[]) => {
      pushParams({ tags: tags.join(","), page: "1" });
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
    setCategoriesState([]);
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return {
    searchInput,
    searchQuery,
    category:
      categories.length === 0
        ? ALL_CATEGORIES_SENTINEL
        : categories.length === 1
          ? categories[0]
          : ALL_CATEGORIES_SENTINEL,
    categories,
    tags: urlTags,
    sortBy: urlSort,
    page: urlPage,
    setSearchInput,
    setCategory,
    toggleCategory,
    setCategories,
    setTags,
    setSortBy,
    loadNextPage,
    clearFilters,
  };
}
