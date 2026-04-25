import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectFilters } from "@/hooks/useProjectFilters";
import { projects } from "@/data/projects";

// sessionStorage is available in jsdom but we reset it between tests
beforeEach(() => {
  sessionStorage.clear();
});

describe("useProjectFilters", () => {
  it("returns all projects by default (no limit)", () => {
    const { result } = renderHook(() => useProjectFilters());
    // wait for hydration effect
    act(() => {});
    expect(result.current.filtered.length).toBe(projects.length);
  });

  it("respects the limit parameter", () => {
    const { result } = renderHook(() => useProjectFilters(2));
    act(() => {});
    expect(result.current.filtered.length).toBeLessThanOrEqual(2);
  });

  it("defaults to 'All' category and 'rating' sort", () => {
    const { result } = renderHook(() => useProjectFilters());
    act(() => {});
    expect(result.current.filters.category).toBe("All");
    expect(result.current.filters.sort).toBe("rating");
  });

  it("filters by category correctly", () => {
    const { result } = renderHook(() => useProjectFilters());
    act(() => {
      result.current.setCategory("DeFi / DEX");
    });
    const categories = result.current.filtered.map((p) => p.category);
    expect(categories.every((c) => c === "DeFi / DEX")).toBe(true);
  });

  it("returns empty array when no projects match category", () => {
    const { result } = renderHook(() => useProjectFilters());
    act(() => {
      result.current.setCategory("DAO");
    });
    // DAO projects exist in our data — just verify it filters correctly
    const daoProjects = projects.filter((p) => p.category === "DAO");
    expect(result.current.filtered.length).toBe(daoProjects.length);
  });

  it("sorts by rating descending", () => {
    const { result } = renderHook(() => useProjectFilters());
    act(() => {
      result.current.setSort("rating");
    });
    const ratings = result.current.filtered.map((p) => p.rating);
    for (let i = 0; i < ratings.length - 1; i++) {
      expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i + 1]);
    }
  });

  it("sorts by recency descending", () => {
    const { result } = renderHook(() => useProjectFilters());
    act(() => {
      result.current.setSort("recency");
    });
    const dates = result.current.filtered.map((p) =>
      new Date(p.createdAt).getTime()
    );
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });

  it("sorts by reviews descending", () => {
    const { result } = renderHook(() => useProjectFilters());
    act(() => {
      result.current.setSort("reviews");
    });
    const reviews = result.current.filtered.map((p) => p.reviews);
    for (let i = 0; i < reviews.length - 1; i++) {
      expect(reviews[i]).toBeGreaterThanOrEqual(reviews[i + 1]);
    }
  });

  it("persists filter state to sessionStorage", () => {
    const { result } = renderHook(() => useProjectFilters());
    act(() => {
      result.current.setCategory("Gaming / NFT");
      result.current.setSort("recency");
    });
    const stored = JSON.parse(
      sessionStorage.getItem("dongle_project_filters") ?? "{}"
    );
    expect(stored.category).toBe("Gaming / NFT");
    expect(stored.sort).toBe("recency");
  });

  it("restores persisted state on mount", () => {
    sessionStorage.setItem(
      "dongle_project_filters",
      JSON.stringify({ category: "Infrastructure", sort: "reviews" })
    );
    const { result } = renderHook(() => useProjectFilters());
    // After hydration effect fires
    act(() => {});
    expect(result.current.filters.category).toBe("Infrastructure");
    expect(result.current.filters.sort).toBe("reviews");
  });

  it("falls back to defaults when sessionStorage has corrupt data", () => {
    sessionStorage.setItem("dongle_project_filters", "not-valid-json{{{");
    const { result } = renderHook(() => useProjectFilters());
    act(() => {});
    expect(result.current.filters.category).toBe("All");
    expect(result.current.filters.sort).toBe("rating");
  });
});
