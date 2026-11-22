import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewPagination } from "@/components/reviews/ReviewPagination";
import type { PaginationMode } from "@/hooks/useReviewPagination";
import { createRef } from "react";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeSentinelRef() {
  return createRef<HTMLDivElement | null>() as React.RefObject<HTMLDivElement | null>;
}

interface Props {
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  isLoadingMore?: boolean;
  mode?: PaginationMode;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onGoToPage?: (n: number) => void;
  onSetMode?: (m: PaginationMode) => void;
}

function renderPagination(overrides: Props = {}) {
  const defaults: Required<Props> = {
    currentPage: 1,
    totalPages: 5,
    totalCount: 83,
    pageSize: 20,
    hasNextPage: true,
    hasPrevPage: false,
    isLoadingMore: false,
    mode: "paginated",
    onNextPage: vi.fn(),
    onPrevPage: vi.fn(),
    onGoToPage: vi.fn(),
    onSetMode: vi.fn(),
  };
  const props = { ...defaults, ...overrides };

  return render(
    <ReviewPagination
      {...props}
      sentinelRef={makeSentinelRef()}
    />,
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("ReviewPagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Renders nothing for empty list ────────────────────────────────────────

  it("renders nothing when totalCount is 0", () => {
    const { container } = renderPagination({ totalCount: 0 });
    expect(container.firstChild).toBeNull();
  });

  // ── Total count display ───────────────────────────────────────────────────

  it("shows total count when list fits on one page", () => {
    renderPagination({ totalCount: 7, totalPages: 1, pageSize: 20 });
    expect(screen.getByText("7 reviews")).toBeInTheDocument();
  });

  it("shows range when list spans multiple pages", () => {
    renderPagination({ currentPage: 2, totalCount: 83, totalPages: 5, pageSize: 20 });
    expect(screen.getByText("Showing 21–40 of 83 reviews")).toBeInTheDocument();
  });

  it("caps range end at totalCount on the last partial page", () => {
    renderPagination({
      currentPage: 5,
      totalCount: 83,
      totalPages: 5,
      pageSize: 20,
      hasNextPage: false,
      hasPrevPage: true,
    });
    expect(screen.getByText("Showing 81–83 of 83 reviews")).toBeInTheDocument();
  });

  // ── Paginated mode ────────────────────────────────────────────────────────

  it("shows Previous and Next buttons in paginated mode", () => {
    renderPagination({ mode: "paginated" });
    expect(screen.getByRole("button", { name: /previous page/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
  });

  it("displays page X of Y in paginated mode", () => {
    renderPagination({ mode: "paginated", currentPage: 2, totalPages: 5 });
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });

  it("disables Previous on page 1", () => {
    renderPagination({ mode: "paginated", hasPrevPage: false });
    expect(screen.getByRole("button", { name: /previous page/i })).toBeDisabled();
  });

  it("enables Previous on page 2+", () => {
    renderPagination({ mode: "paginated", hasPrevPage: true });
    expect(screen.getByRole("button", { name: /previous page/i })).not.toBeDisabled();
  });

  it("disables Next on last page", () => {
    renderPagination({ mode: "paginated", hasNextPage: false, hasPrevPage: true });
    expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled();
  });

  it("calls onNextPage when Next is clicked", async () => {
    const onNextPage = vi.fn();
    renderPagination({ mode: "paginated", onNextPage });
    await userEvent.click(screen.getByRole("button", { name: /next page/i }));
    expect(onNextPage).toHaveBeenCalledTimes(1);
  });

  it("calls onPrevPage when Previous is clicked", async () => {
    const onPrevPage = vi.fn();
    renderPagination({ mode: "paginated", hasPrevPage: true, onPrevPage });
    await userEvent.click(screen.getByRole("button", { name: /previous page/i }));
    expect(onPrevPage).toHaveBeenCalledTimes(1);
  });

  it("hides Previous/Next nav when there is only one page", () => {
    renderPagination({ mode: "paginated", totalPages: 1, hasNextPage: false });
    expect(screen.queryByRole("button", { name: /previous page/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next page/i })).not.toBeInTheDocument();
  });

  // ── Load-more mode ────────────────────────────────────────────────────────

  it("shows the Load more button when in load-more mode and hasNextPage is true", () => {
    renderPagination({ mode: "load-more", hasNextPage: true });
    expect(
      screen.getByRole("button", { name: /load more reviews/i }),
    ).toBeInTheDocument();
  });

  it("hides the Load more button when hasNextPage is false", () => {
    renderPagination({ mode: "load-more", hasNextPage: false });
    expect(
      screen.queryByRole("button", { name: /load more reviews/i }),
    ).not.toBeInTheDocument();
  });

  it("hides the Load more button while isLoadingMore is true", () => {
    renderPagination({ mode: "load-more", hasNextPage: true, isLoadingMore: true });
    expect(
      screen.queryByRole("button", { name: /load more reviews/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onNextPage when Load more is clicked", async () => {
    const onNextPage = vi.fn();
    renderPagination({ mode: "load-more", hasNextPage: true, onNextPage });
    await userEvent.click(screen.getByRole("button", { name: /load more reviews/i }));
    expect(onNextPage).toHaveBeenCalledTimes(1);
  });

  // ── Loading spinner ───────────────────────────────────────────────────────

  it("shows a loading spinner while isLoadingMore is true", () => {
    renderPagination({ isLoadingMore: true });
    expect(screen.getByRole("status", { name: /loading more reviews/i })).toBeInTheDocument();
  });

  it("hides the spinner when isLoadingMore is false", () => {
    renderPagination({ isLoadingMore: false });
    expect(
      screen.queryByRole("status", { name: /loading more reviews/i }),
    ).not.toBeInTheDocument();
  });

  // ── Mode toggle ───────────────────────────────────────────────────────────

  it("renders all three mode toggle buttons", () => {
    renderPagination();
    const group = screen.getByRole("group", { name: /review display mode/i });
    expect(group.querySelectorAll("button")).toHaveLength(3);
  });

  it("marks the current mode button as pressed", () => {
    renderPagination({ mode: "load-more" });
    const btn = screen.getByRole("button", { name: /load more/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSetMode with the selected mode when toggled", async () => {
    const onSetMode = vi.fn();
    renderPagination({ mode: "paginated", onSetMode });
    await userEvent.click(screen.getByRole("button", { name: /infinite scroll/i }));
    expect(onSetMode).toHaveBeenCalledWith("infinite");
  });

  // ── Jump to page ──────────────────────────────────────────────────────────

  it("does not show jump-to-page when totalPages is below threshold", () => {
    // Threshold is 100 pages (REVIEWS_JUMP_THRESHOLD)
    renderPagination({ mode: "paginated", totalPages: 5 });
    expect(screen.queryByRole("form", { name: /jump to page/i })).not.toBeInTheDocument();
  });

  it("shows jump-to-page when totalPages meets the threshold (100)", () => {
    renderPagination({ mode: "paginated", totalPages: 100 });
    expect(screen.getByRole("form", { name: /jump to page/i })).toBeInTheDocument();
  });

  it("calls onGoToPage with the parsed page number when submitted", async () => {
    const onGoToPage = vi.fn();
    renderPagination({ mode: "paginated", totalPages: 100, onGoToPage });
    const input = screen.getByRole("spinbutton", { name: /jump to page/i });
    await userEvent.clear(input);
    await userEvent.type(input, "42");
    fireEvent.submit(input.closest("form")!);
    expect(onGoToPage).toHaveBeenCalledWith(42);
  });

  it("does not call onGoToPage for non-numeric input", () => {
    const onGoToPage = vi.fn();
    renderPagination({ mode: "paginated", totalPages: 100, onGoToPage });
    const input = screen.getByRole("spinbutton", { name: /jump to page/i });
    fireEvent.submit(input.closest("form")!);
    expect(onGoToPage).not.toHaveBeenCalled();
  });
});
