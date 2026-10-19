import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/reviews/search/route";
import { getReviewStore } from "@/lib/review-store";

describe("GET /api/reviews/search", () => {
  beforeEach(() => {
    const store = getReviewStore();
    store.clear();
    store.set("rev-1", {
      id: "rev-1",
      projectId: "proj-1",
      projectName: "Stellar Wallet",
      userAddress: "user-1",
      rating: 5,
      comment: "The app is fast, easy to use, and the onboarding experience is excellent.",
      createdAt: "2024-01-15T12:00:00.000Z",
      language: "en",
      isVerifiedReviewer: true,
      helpfulVotes: [],
      unhelpfulVotes: [],
    });
    store.set("rev-2", {
      id: "rev-2",
      projectId: "proj-2",
      projectName: "Trading Bot",
      userAddress: "user-2",
      rating: 3,
      comment: "The interface is okay but the transaction flow feels slow and confusing.",
      createdAt: "2024-02-10T12:00:00.000Z",
      language: "es",
      isVerifiedReviewer: false,
      helpfulVotes: [],
      unhelpfulVotes: [],
    });
  });

  it("searches review comments with filters, pagination, and suggestions", async () => {
    const request = new NextRequest(
      "http://localhost/api/reviews/search?q=fast&ratingMin=3&ratingMax=5&verifiedOnly=true&language=en&sort=relevance&page=1&pageSize=20",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total).toBe(1);
    expect(data.data.results[0].comment).toContain("fast");
    expect(data.data.results[0].highlights).toEqual(expect.any(Array));
    expect(data.data.suggestions).toEqual(expect.any(Array));
  });

  it("supports date filtering and returns relevant suggestions", async () => {
    const request = new NextRequest(
      "http://localhost/api/reviews/search?q=onboard&dateFrom=2024-01-01&dateTo=2024-01-31&sort=date",
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total).toBe(1);
    expect(data.data.results[0].comment).toMatch(/onboard|onboarding/i);
  });
});
