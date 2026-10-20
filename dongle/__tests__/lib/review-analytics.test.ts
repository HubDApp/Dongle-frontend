import { describe, expect, it } from "vitest";
import { computeReviewAnalytics } from "@/lib/review-analytics";
import { PROJECT_CATEGORIES, type Project } from "@/types/project";
import type { Review, ReviewReport } from "@/types/review";

const projects: Project[] = [
  {
    id: "project-a",
    name: "Alpha",
    primaryCategory: PROJECT_CATEGORIES.DEFI,
    description: "Alpha project",
    rating: 4,
    reviews: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "project-b",
    name: "Beta",
    primaryCategory: PROJECT_CATEGORIES.DAO,
    description: "Beta project",
    rating: 3,
    reviews: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const reviews: Review[] = [
  {
    id: "review-a",
    projectId: "project-a",
    projectName: "Alpha",
    userAddress: "GONE",
    rating: 5,
    comment: "Helpful review",
    createdAt: "2026-06-15T12:00:00.000Z",
    helpfulVotes: ["G1", "G2"],
    unhelpfulVotes: ["G3"],
  },
  {
    id: "review-b",
    projectId: "project-a",
    projectName: "Alpha",
    userAddress: "GTWO",
    rating: 2,
    comment: "Less helpful review",
    createdAt: "2026-06-16T12:00:00.000Z",
    helpfulVotes: [],
    unhelpfulVotes: ["G4"],
  },
  {
    id: "review-c",
    projectId: "project-b",
    projectName: "Beta",
    userAddress: "GONE",
    rating: 4,
    comment: "Outside selected range",
    createdAt: "2026-05-01T12:00:00.000Z",
  },
];

const reports: ReviewReport[] = [
  {
    id: "report-a",
    reviewId: "review-a",
    reporterAddress: "GREPORTER",
    reason: "other",
    explanation: "",
    status: "pending",
    createdAt: "2026-06-17T12:00:00.000Z",
  },
];

describe("review analytics", () => {
  it("calculates review metrics, ranks, reviewer quality, and weekly trends", () => {
    const result = computeReviewAnalytics(reviews, projects, reports, { "review-a": 12 }, {
      projectId: "all",
      category: "all",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    expect(result.reviews[0].review.id).toBe("review-a");
    expect(result.reviews[0]).toMatchObject({
      helpfulnessRatio: 2 / 3,
      viewCount: 12,
      responseCount: 0,
      reportCount: 1,
    });
    expect(result.reviews[0].engagementScore).toBeGreaterThan(0);
    expect(result.reviewers[0]).toMatchObject({ reviewer: "GONE", averageHelpfulness: 2 / 3 });
    expect(result.trends).toEqual([
      { week: "2026-06-15", helpfulnessRatio: 0.5, reviewCount: 2 },
    ]);
    expect(result.summary).toMatchObject({ reviewCount: 2, totalViews: 12, totalReports: 1 });
  });

  it("filters by project, category, and inclusive date range", () => {
    const result = computeReviewAnalytics(reviews, projects, reports, {}, {
      projectId: "project-a",
      category: PROJECT_CATEGORIES.DEFI,
      startDate: "2026-06-16",
      endDate: "2026-06-16",
    });

    expect(result.reviews.map((row) => row.review.id)).toEqual(["review-b"]);
  });

  it("does not treat reviews with no votes as helpful or unhelpful", () => {
    const result = computeReviewAnalytics([reviews[2]], projects, [], {}, {
      projectId: "all",
      category: "all",
      startDate: "",
      endDate: "",
    });

    expect(result.reviews[0].helpfulnessRatio).toBeNull();
    expect(result.summary.averageHelpfulness).toBeNull();
    expect(result.reviewers[0].averageHelpfulness).toBeNull();
  });
});