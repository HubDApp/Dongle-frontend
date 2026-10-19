import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReviewList from "@/components/reviews/ReviewList";
import type { Review } from "@/types/review";

vi.mock("@/lib/i18n/useTranslation", () => ({
  useTranslation: () => ({ locale: "en" }),
}));

const review: Review = {
  id: "review-1",
  projectId: "project-1",
  projectName: "Test Project",
  userAddress: "GUSER",
  rating: 5,
  comment: "Excellent service, I love this product!",
  createdAt: "2026-01-01T00:00:00Z",
  sentiment: "positive",
  sentimentSource: "automatic",
};

describe("Review sentiment display", () => {
  it("hides sentiment from the review author", () => {
    render(
      <ReviewList
        reviews={[review]}
        currentUserAddress="GUSER"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Review sentiment: Positive")).toBeNull();
  });

  it("shows sentiment to other users and allows admins to override it", () => {
    const onOverrideSentiment = vi.fn();
    render(
      <ReviewList
        reviews={[review]}
        currentUserAddress="GVIEWER"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isAdmin
        onOverrideSentiment={onOverrideSentiment}
      />,
    );

    expect(screen.getByLabelText("Review sentiment: Positive")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Override sentiment for review by GUSER" }),
      { target: { value: "negative" } },
    );
    expect(onOverrideSentiment).toHaveBeenCalledWith("review-1", "negative");
  });
});
