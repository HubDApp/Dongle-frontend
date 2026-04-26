"use client";

import { useState, useMemo, useCallback, useSyncExternalStore } from "react";
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

// useSyncExternalStore snapshot helpers — no-op subscribe since we own all writes
const subscribe = () => () => {};

export function useProjectFilters(limit?: number) {
  // useSyncExternalStore gives us the correct SSR snapshot on server and the
  // real sessionStorage value on the client — no setState inside an effect needed.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,   // client snapshot: always mounted
    () => false,  // server snapshot: not yet mounted
  );

  // Lazy initializer reads sessionStorage once on first client render
  const [filters, setFilters] = useState<ProjectFiltersState>(() =>
    typeof window !== "undefined" ? loadPersistedState() : DEFAULT_STATE
  );

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
    const result =
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
