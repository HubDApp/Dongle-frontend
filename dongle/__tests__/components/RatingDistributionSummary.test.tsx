import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RatingDistributionSummary,
  computeRatingDistribution,
} from "@/components/reviews/RatingDistributionSummary";

describe("computeRatingDistribution", () => {
  it("counts reviews per star rating", () => {
    const dist = computeRatingDistribution([
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 1 },
    ]);

    expect(dist).toEqual({ 5: 2, 4: 1, 3: 0, 2: 0, 1: 1 });
  });

  it("ignores invalid ratings", () => {
    const dist = computeRatingDistribution([
      { rating: 0 },
      { rating: 6 },
      { rating: 3 },
    ]);

    expect(dist[3]).toBe(1);
    expect(dist[5]).toBe(0);
  });
});

describe("RatingDistributionSummary", () => {
  it("shows empty state when there are no reviews", () => {
    render(
      <RatingDistributionSummary
        distribution={{ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }}
        totalReviews={0}
        averageRating={0}
      />,
    );

    expect(
      screen.getByText(/rating distribution will appear once users leave feedback/i),
    ).toBeInTheDocument();
  });

  it("renders per-star counts and percentages", () => {
    render(
      <RatingDistributionSummary
        distribution={{ 5: 2, 4: 1, 3: 0, 2: 0, 1: 0 }}
        totalReviews={3}
        averageRating={4.7}
      />,
    );

    expect(screen.getByText("4.7")).toBeInTheDocument();
    expect(screen.getByText("3 total reviews")).toBeInTheDocument();
    expect(screen.getByText("2 (67%)")).toBeInTheDocument();
    expect(screen.getByText("1 (33%)")).toBeInTheDocument();
  });
});
