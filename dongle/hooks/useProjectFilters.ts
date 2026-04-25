"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { projects, type Project, type ProjectCategory } from "@/data/projects";

export type SortOption = "rating" | "recency" | "reviews";

export interface ProjectFiltersState {
  category: ProjectCategory;
  sort: SortOption;
}

const STORAGE_KEY = "dongle_project_filters";

const DEFAULT_STATE: ProjectFiltersState = {
  category: "All",
  sort: "rating",
};

function loadPersistedState(): ProjectFiltersState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ProjectFiltersState>;
    return {
      category: parsed.category ?? DEFAULT_STATE.category,
      sort: parsed.sort ?? DEFAULT_STATE.sort,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function persistState(state: ProjectFiltersState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable — silently ignore
  }
}

export function useProjectFilters(limit?: number) {
  const [filters, setFilters] = useState<ProjectFiltersState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted state after hydration to avoid SSR mismatch
  useEffect(() => {
    setFilters(loadPersistedState());
    setHydrated(true);
  }, []);

  const setCategory = useCallback((category: ProjectCategory) => {
    setFilters((prev) => {
      const next = { ...prev, category };
      persistState(next);
      return next;
    });
  }, []);

  const setSort = useCallback((sort: SortOption) => {
    setFilters((prev) => {
      const next = { ...prev, sort };
      persistState(next);
      return next;
    });
  }, []);

  const filtered = useMemo<Project[]>(() => {
    let result =
      filters.category === "All"
        ? [...projects]
        : projects.filter((p) => p.category === filters.category);

    switch (filters.sort) {
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "reviews":
        result.sort((a, b) => b.reviews - a.reviews);
        break;
      case "recency":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return limit ? result.slice(0, limit) : result;
  }, [filters, limit]);

  return { filters, filtered, setCategory, setSort, hydrated };
}
