import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecentViews } from "@/hooks/useRecentViews";
import { recentViewsService } from "@/services/recent-views/recent-views.service";
import { mockProjects } from "@/data/mockProjects";

describe("useRecentViews", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("records views without duplicating entries", () => {
    const { result } = renderHook(() => useRecentViews());

    act(() => {
      result.current.trackView(mockProjects[0].id);
      result.current.trackView(mockProjects[1].id);
      result.current.trackView(mockProjects[0].id);
    });

    expect(result.current.recentProjects.map((p) => p.id)).toEqual([
      mockProjects[0].id,
      mockProjects[1].id,
    ]);
    expect(recentViewsService.getAllViews()).toHaveLength(2);
  });

  it("clears recent history", () => {
    const { result } = renderHook(() => useRecentViews());

    act(() => {
      result.current.trackView(mockProjects[0].id);
      result.current.clearHistory();
    });

    expect(result.current.recentProjects).toEqual([]);
    expect(result.current.hasHistory).toBe(false);
  });
});
