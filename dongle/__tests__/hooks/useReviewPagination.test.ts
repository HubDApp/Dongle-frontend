import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReviewPagination } from "@/hooks/useReviewPagination";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/navigation is stubbed in vitest.setup.ts; we need writable versions
// for push/replace so we can assert calls.

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/reviews",
  useSearchParams: () => new URLSearchParams(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an array of N dummy review-like objects. */
function makeItems(n: number): { id: number }[] {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("useReviewPagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it("starts on page 1 by default", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(50)));
    expect(result.current.currentPage).toBe(1);
  });

  it("computes totalPages from item count and page size", () => {
    const { result } = renderHook(() =>
      useReviewPagination(makeItems(45), { pageSize: 20 }),
    );
    // 45 / 20 = 2.25 → 3 pages
    expect(result.current.totalPages).toBe(3);
  });

  it("exposes totalCount equal to the full items length", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(83)));
    expect(result.current.totalCount).toBe(83);
  });

  it("defaults to paginated mode", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(50)));
    expect(result.current.mode).toBe("paginated");
  });

  // ── 20-reviews-per-page ───────────────────────────────────────────────────

  it("shows the first 20 reviews on page 1 with default page size", () => {
    const items = makeItems(83);
    const { result } = renderHook(() => useReviewPagination(items));
    expect(result.current.visibleReviews).toHaveLength(20);
    expect(result.current.visibleReviews[0]).toEqual({ id: 1 });
    expect(result.current.visibleReviews[19]).toEqual({ id: 20 });
  });

  it("shows the correct slice on page 2", () => {
    const items = makeItems(83);
    const { result } = renderHook(() => useReviewPagination(items));
    act(() => result.current.goToPage(2));
    expect(result.current.visibleReviews[0]).toEqual({ id: 21 });
    expect(result.current.visibleReviews[19]).toEqual({ id: 40 });
  });

  it("shows the remaining items on the last partial page", () => {
    const items = makeItems(45);
    const { result } = renderHook(() => useReviewPagination(items, { pageSize: 20 }));
    act(() => result.current.goToPage(3));
    // Page 3: items 41–45 → 5 items
    expect(result.current.visibleReviews).toHaveLength(5);
    expect(result.current.visibleReviews[0]).toEqual({ id: 41 });
  });

  // ── hasNextPage / hasPrevPage ─────────────────────────────────────────────

  it("sets hasNextPage true when not on the last page", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(50)));
    expect(result.current.hasNextPage).toBe(true);
  });

  it("sets hasNextPage false on the last page", () => {
    const { result } = renderHook(() =>
      useReviewPagination(makeItems(20), { pageSize: 20 }),
    );
    expect(result.current.hasNextPage).toBe(false);
  });

  it("sets hasPrevPage false on page 1", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(50)));
    expect(result.current.hasPrevPage).toBe(false);
  });

  it("sets hasPrevPage true when past page 1", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(50)));
    act(() => result.current.goToPage(2));
    expect(result.current.hasPrevPage).toBe(true);
  });

  // ── goToNextPage / goToPrevPage ───────────────────────────────────────────

  it("increments page via goToNextPage", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(60)));
    act(() => result.current.goToNextPage());
    expect(result.current.currentPage).toBe(2);
  });

  it("does not go past the last page", () => {
    const items = makeItems(20);
    const { result } = renderHook(() =>
      useReviewPagination(items, { pageSize: 20 }),
    );
    act(() => result.current.goToNextPage());
    expect(result.current.currentPage).toBe(1);
  });

  it("decrements page via goToPrevPage", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(60)));
    act(() => result.current.goToPage(3));
    act(() => result.current.goToPrevPage());
    expect(result.current.currentPage).toBe(2);
  });

  it("does not go below page 1 via goToPrevPage", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(60)));
    act(() => result.current.goToPrevPage());
    expect(result.current.currentPage).toBe(1);
  });

  // ── goToPage clamping ─────────────────────────────────────────────────────

  it("clamps goToPage to 1 when given 0 or negative", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(60)));
    act(() => result.current.goToPage(0));
    expect(result.current.currentPage).toBe(1);
  });

  it("clamps goToPage to totalPages when given a number exceeding it", () => {
    const { result } = renderHook(() =>
      useReviewPagination(makeItems(40), { pageSize: 20 }),
    );
    act(() => result.current.goToPage(999));
    expect(result.current.currentPage).toBe(2);
  });

  // ── Load-more mode ────────────────────────────────────────────────────────

  it("accumulates reviews in load-more mode", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useReviewPagination(makeItems(60)));

    act(() => result.current.setMode("load-more"));
    expect(result.current.visibleReviews).toHaveLength(20);

    act(() => result.current.goToNextPage());
    // isLoadingMore is true while the 150 ms delay runs
    expect(result.current.isLoadingMore).toBe(true);

    act(() => vi.advanceTimersByTime(200));
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.visibleReviews).toHaveLength(40);
  });

  it("shows all items up to the loaded batch in load-more mode", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useReviewPagination(makeItems(50), { pageSize: 20 }),
    );
    act(() => result.current.setMode("load-more"));

    act(() => result.current.goToNextPage());
    act(() => vi.advanceTimersByTime(200));

    // Pages 1 & 2 loaded → 40 items (50 total, so all 40 from first two pages)
    expect(result.current.visibleReviews).toHaveLength(40);
  });

  // ── Mode persistence ─────────────────────────────────────────────────────

  it("persists mode to localStorage", () => {
    const { result } = renderHook(() => useReviewPagination(makeItems(60)));
    act(() => result.current.setMode("infinite"));
    expect(localStorage.getItem("dongle_reviews_pagination_mode")).toBe("infinite");
  });

  it("restores mode from localStorage on mount", () => {
    localStorage.setItem("dongle_reviews_pagination_mode", "load-more");
    const { result } = renderHook(() => useReviewPagination(makeItems(60)));
    expect(result.current.mode).toBe("load-more");
  });

  // ── Empty list ────────────────────────────────────────────────────────────

  it("handles an empty list gracefully", () => {
    const { result } = renderHook(() => useReviewPagination([]));
    expect(result.current.visibleReviews).toHaveLength(0);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it("handles a list smaller than one page", () => {
    const { result } = renderHook(() =>
      useReviewPagination(makeItems(5), { pageSize: 20 }),
    );
    expect(result.current.visibleReviews).toHaveLength(5);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.hasNextPage).toBe(false);
  });

  // ── Page reset on list change ─────────────────────────────────────────────

  it("resets to page 1 when items list length changes (filter applied)", () => {
    vi.useFakeTimers();
    let items = makeItems(60);
    const { result, rerender } = renderHook(
      ({ list }) => useReviewPagination(list, { pageSize: 20 }),
      { initialProps: { list: items } },
    );

    act(() => result.current.goToPage(3));
    expect(result.current.currentPage).toBe(3);

    // Simulate filter reducing the list
    items = makeItems(10);
    rerender({ list: items });

    expect(result.current.currentPage).toBe(1);
  });

  // ── Custom page size ──────────────────────────────────────────────────────

  it("respects a custom pageSize option", () => {
    const { result } = renderHook(() =>
      useReviewPagination(makeItems(100), { pageSize: 10 }),
    );
    expect(result.current.visibleReviews).toHaveLength(10);
    expect(result.current.totalPages).toBe(10);
  });
});
