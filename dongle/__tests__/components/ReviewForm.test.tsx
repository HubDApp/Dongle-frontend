import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewForm from "@/components/reviews/ReviewForm";
import { REVIEW_CONSTRAINTS } from "@/types/review";

const { reviewServiceMock } = vi.hoisted(() => ({
  reviewServiceMock: {
    addReview: vi.fn(),
  },
}));

vi.mock("@/services/review/review.service", () => ({
  reviewService: reviewServiceMock,
}));

vi.mock("@/hooks/useUnsavedChanges", () => ({
  useUnsavedChanges: vi.fn(),
}));

const defaultProps = {
  projectId: "project-1",
  projectName: "Stellar Wallet",
  userAddress: "GUSER123",
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

function renderForm(overrides: Partial<typeof defaultProps> = {}) {
  return render(<ReviewForm {...defaultProps} {...overrides} />);
}

describe("ReviewForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewServiceMock.addReview.mockResolvedValue({ success: true });
  });

  it("renders the project name, five rating controls, and comment field", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: "Add Review" })).toBeInTheDocument();
    expect(screen.getByText("Stellar Wallet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /rate .* star/i })).toHaveLength(5);
    expect(screen.getByRole("textbox", { name: "Comment" })).toBeInTheDocument();
  });

  it("updates the selected rating from one to five stars", async () => {
    const user = userEvent.setup();
    renderForm();

    const fourStars = screen.getByRole("button", { name: "Rate 4 stars" });
    await user.click(fourStars);

    expect(fourStars).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Rate 5 stars" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("exposes the comment character limit and updates its counter", async () => {
    const user = userEvent.setup();
    renderForm();

    const comment = screen.getByRole("textbox", { name: "Comment" });
    expect(comment).toHaveAttribute("maxLength", String(REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH));
    expect(screen.getByText(`0 / ${REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH}`)).toBeInTheDocument();

    await user.type(comment, "A useful review");

    expect(
      screen.getByText(`17 / ${REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH}`),
    ).toBeInTheDocument();
  });

  it("requires a comment of at least the minimum length", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByRole("textbox", { name: "Comment" }), "Too short");
    await user.click(screen.getByRole("button", { name: "Post Review" }));

    expect(
      screen.getByText(`Comment must be at least ${REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH} characters`),
    ).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("rejects comments longer than the maximum length", () => {
    renderForm();

    fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), {
      target: { value: "x".repeat(REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH + 1) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post Review" }));

    expect(
      screen.getByText(`Comment cannot exceed ${REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH} characters`),
    ).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it("passes the selected rating and comment to the review submission boundary", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((data: { rating: number; comment: string }) => {
      reviewServiceMock.addReview(
        {
          projectId: defaultProps.projectId,
          projectName: defaultProps.projectName,
          userAddress: defaultProps.userAddress,
          ...data,
        },
        defaultProps.userAddress,
      );
    });
    renderForm({ onSubmit });

    await user.click(screen.getByRole("button", { name: "Rate 3 stars" }));
    await user.type(screen.getByRole("textbox", { name: "Comment" }), "A thoughtful review");
    await user.click(screen.getByRole("button", { name: "Post Review" }));

    expect(onSubmit).toHaveBeenCalledWith({ rating: 3, comment: "A thoughtful review" });
    expect(reviewServiceMock.addReview).toHaveBeenCalledWith(
      {
        projectId: "project-1",
        projectName: "Stellar Wallet",
        userAddress: "GUSER123",
        rating: 3,
        comment: "A thoughtful review",
      },
      "GUSER123",
    );
  });

  it("calls cancel for both the close control and Cancel button", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderForm({ onCancel });

    await user.click(screen.getByRole("button", { name: "Close form" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("renders edit mode with the initial review values", () => {
    renderForm({
      initialReview: {
        id: "review-1",
        projectId: "project-1",
        projectName: "Stellar Wallet",
        userAddress: "GUSER123",
        rating: 2,
        comment: "Existing review comment",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(screen.getByRole("heading", { name: "Edit Review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rate 2 stars" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Comment" })).toHaveValue(
      "Existing review comment",
    );
  });
});
