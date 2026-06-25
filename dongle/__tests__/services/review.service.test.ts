import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { reviewService } from "@/services/review/review.service";
import { REVIEW_CONSTRAINTS } from "@/types/review";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Review Service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("addReview", () => {
    it("should add a valid review", () => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 5,
        comment: "This is a great project with excellent features",
      };

      const result = reviewService.addReview(review, "user1");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
      expect(result.data?.rating).toBe(5);
      expect(result.data?.comment).toBe(review.comment);
    });

    it("should reject review with invalid rating (too low)", () => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 0,
        comment: "This is a great project with excellent features",
      };

      const result = reviewService.addReview(review, "user1");

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].field).toBe("rating");
      expect(result.errors?.[0].message).toContain("between");
    });

    it("should reject review with invalid rating (too high)", () => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 6,
        comment: "This is a great project with excellent features",
      };

      const result = reviewService.addReview(review, "user1");

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe("rating");
    });

    it("should reject review with non-integer rating", () => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 3.5,
        comment: "This is a great project with excellent features",
      };

      const result = reviewService.addReview(review, "user1");

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe("rating");
    });

    it("should reject review with comment too short", () => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 5,
        comment: "Too short",
      };

      const result = reviewService.addReview(review, "user1");

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe("comment");
      expect(result.errors?.[0].message).toContain("at least");
    });

    it("should reject review with comment too long", () => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 5,
        comment: "a".repeat(REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH + 1),
      };

      const result = reviewService.addReview(review, "user1");

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe("comment");
      expect(result.errors?.[0].message).toContain("cannot exceed");
    });

    it("should reject duplicate review from same user for same project", () => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 5,
        comment: "This is a great project with excellent features",
      };

      const result1 = reviewService.addReview(review, "user1");
      expect(result1.success).toBe(true);

      const result2 = reviewService.addReview(review, "user1");
      expect(result2.success).toBe(false);
      expect(result2.errors?.[0].message).toContain("already reviewed");
    });

    it("should allow different users to review same project", () => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        rating: 5,
        comment: "This is a great project with excellent features",
      };

      const result1 = reviewService.addReview(
        { ...review, userAddress: "user1" },
        "user1"
      );
      expect(result1.success).toBe(true);

      const result2 = reviewService.addReview(
        { ...review, userAddress: "user2" },
        "user2"
      );
      expect(result2.success).toBe(true);
    });

    it("should allow same user to review different projects", () => {
      const review = {
        userAddress: "user1",
        rating: 5,
        comment: "This is a great project with excellent features",
      };

      const result1 = reviewService.addReview(
        { ...review, projectId: "proj1", projectName: "Project 1" },
        "user1"
      );
      expect(result1.success).toBe(true);

      const result2 = reviewService.addReview(
        { ...review, projectId: "proj2", projectName: "Project 2" },
        "user1"
      );
      expect(result2.success).toBe(true);
    });
  });

  describe("updateReview", () => {
    let reviewId: string;

    beforeEach(() => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 5,
        comment: "This is a great project with excellent features",
      };
      const result = reviewService.addReview(review, "user1");
      reviewId = result.data?.id || "";
    });

    it("should update review by owner", () => {
      const result = reviewService.updateReview(
        reviewId,
        { rating: 4, comment: "Updated comment with more details here" },
        "user1"
      );

      expect(result.success).toBe(true);
      expect(result.data?.rating).toBe(4);
      expect(result.data?.comment).toBe("Updated comment with more details here");
    });

    it("should reject update by non-owner", () => {
      const result = reviewService.updateReview(
        reviewId,
        { rating: 4, comment: "Updated comment with more details here" },
        "user2"
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain("permission");
    });

    it("should reject update with invalid rating", () => {
      const result = reviewService.updateReview(
        reviewId,
        { rating: 10, comment: "Updated comment with more details here" },
        "user1"
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe("rating");
    });

    it("should reject update with invalid comment", () => {
      const result = reviewService.updateReview(
        reviewId,
        { rating: 4, comment: "short" },
        "user1"
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe("comment");
    });

    it("should reject update of non-existent review", () => {
      const result = reviewService.updateReview(
        "nonexistent",
        { rating: 4, comment: "Updated comment with more details here" },
        "user1"
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain("not found");
    });

    it("should allow partial updates", () => {
      const result = reviewService.updateReview(
        reviewId,
        { rating: 3 },
        "user1"
      );

      expect(result.success).toBe(true);
      expect(result.data?.rating).toBe(3);
      expect(result.data?.comment).toBe(
        "This is a great project with excellent features"
      );
    });
  });

  describe("deleteReview", () => {
    let reviewId: string;

    beforeEach(() => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 5,
        comment: "This is a great project with excellent features",
      };
      const result = reviewService.addReview(review, "user1");
      reviewId = result.data?.id || "";
    });

    it("should delete review by owner", () => {
      const result = reviewService.deleteReview(reviewId, "user1");

      expect(result.success).toBe(true);
      const reviews = reviewService.getReviews();
      expect(reviews.find((r) => r.id === reviewId)).toBeUndefined();
    });

    it("should reject delete by non-owner", () => {
      const result = reviewService.deleteReview(reviewId, "user2");

      expect(result.success).toBe(false);
      expect(result.error).toContain("permission");
      const reviews = reviewService.getReviews();
      expect(reviews.find((r) => r.id === reviewId)).toBeDefined();
    });

    it("should reject delete of non-existent review", () => {
      const result = reviewService.deleteReview("nonexistent", "user1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("getReviewsByProject", () => {
    beforeEach(() => {
      const reviews = [
        {
          projectId: "proj1",
          projectName: "Project 1",
          userAddress: "user1",
          rating: 5,
          comment: "This is a great project with excellent features",
        },
        {
          projectId: "proj1",
          projectName: "Project 1",
          userAddress: "user2",
          rating: 4,
          comment: "Good project with some minor issues here",
        },
        {
          projectId: "proj2",
          projectName: "Project 2",
          userAddress: "user1",
          rating: 3,
          comment: "Average project with decent functionality",
        },
      ];

      reviews.forEach((review) => {
        reviewService.addReview(review, review.userAddress);
      });
    });

    it("should return all reviews for a project", () => {
      const reviews = reviewService.getReviewsByProject("proj1");
      expect(reviews).toHaveLength(2);
      expect(reviews.every((r) => r.projectId === "proj1")).toBe(true);
    });

    it("should return empty array for project with no reviews", () => {
      const reviews = reviewService.getReviewsByProject("nonexistent");
      expect(reviews).toHaveLength(0);
    });
  });

  describe("getReviewsByUser", () => {
    beforeEach(() => {
      const reviews = [
        {
          projectId: "proj1",
          projectName: "Project 1",
          userAddress: "user1",
          rating: 5,
          comment: "This is a great project with excellent features",
        },
        {
          projectId: "proj2",
          projectName: "Project 2",
          userAddress: "user1",
          rating: 4,
          comment: "Good project with some minor issues here",
        },
        {
          projectId: "proj1",
          projectName: "Project 1",
          userAddress: "user2",
          rating: 3,
          comment: "Average project with decent functionality",
        },
      ];

      reviews.forEach((review) => {
        reviewService.addReview(review, review.userAddress);
      });
    });

    it("should return all reviews by a user", () => {
      const reviews = reviewService.getReviewsByUser("user1");
      expect(reviews).toHaveLength(2);
      expect(reviews.every((r) => r.userAddress === "user1")).toBe(true);
    });

    it("should return empty array for user with no reviews", () => {
      const reviews = reviewService.getReviewsByUser("nonexistent");
      expect(reviews).toHaveLength(0);
    });
  });

  describe("getReviews safe loading", () => {
    it("should handle missing localStorage entry gracefully", () => {
      localStorage.removeItem("dongle_reviews");
      const reviews = reviewService.getReviews();
      expect(reviews).toEqual([]);
    });

    it("should handle corrupt JSON gracefully by returning empty array", () => {
      localStorage.setItem("dongle_reviews", "corrupt { json: ... }");
      const reviews = reviewService.getReviews();
      expect(reviews).toEqual([]);
    });

    it("should handle non-array stored data by returning empty array", () => {
      localStorage.setItem("dongle_reviews", JSON.stringify({ notAnArray: true }));
      const reviews = reviewService.getReviews();
      expect(reviews).toEqual([]);
    });

    it("should filter out invalid review records and keep valid ones", () => {
      const storedData = [
        {
          id: "r1",
          projectId: "p1",
          projectName: "Proj 1",
          userAddress: "u1",
          rating: 4,
          comment: "This is a valid review comment",
          createdAt: "2026-06-25T12:00:00.000Z",
        },
        {
          // Missing userAddress
          id: "r2",
          projectId: "p1",
          projectName: "Proj 1",
          rating: 4,
          comment: "This has no user address",
        },
        {
          // Missing projectId
          id: "r3",
          projectName: "Proj 1",
          userAddress: "u1",
          rating: 3,
          comment: "This has no project ID",
        },
        {
          // Invalid rating
          id: "r4",
          projectId: "p1",
          projectName: "Proj 1",
          userAddress: "u1",
          rating: "invalid",
          comment: "This has an invalid rating",
        },
        {
          // Missing comment
          id: "r5",
          projectId: "p1",
          projectName: "Proj 1",
          userAddress: "u1",
          rating: 5,
        },
      ];

      localStorage.setItem("dongle_reviews", JSON.stringify(storedData));
      const reviews = reviewService.getReviews();

      expect(reviews).toHaveLength(1);
      expect(reviews[0].id).toBe("r1");
    });

    it("should migrate incomplete but recoverable review records", () => {
      const storedData = [
        {
          // Missing id, projectName, and createdAt
          projectId: "p1",
          userAddress: "u1",
          rating: 3,
          comment: "Comment that is long enough to be valid.",
        },
        {
          // Rating out of bounds (should clamp)
          id: "r2",
          projectId: "p1",
          projectName: "Proj 1",
          userAddress: "u1",
          rating: 6,
          comment: "Another comment that is long enough.",
        },
      ];

      localStorage.setItem("dongle_reviews", JSON.stringify(storedData));
      const reviews = reviewService.getReviews();

      expect(reviews).toHaveLength(2);
      
      // Verification of migration 1
      expect(reviews[0].id).toBeDefined();
      expect(reviews[0].projectName).toBe("Unknown Project");
      expect(reviews[0].createdAt).toBeDefined();
      expect(new Date(reviews[0].createdAt).getTime()).not.toBeNaN();

      // Verification of migration 2 (clamped rating)
      expect(reviews[1].rating).toBe(5);
    });
  });

  describe("Voting and Sorting", () => {
    let reviewId: string;

    beforeEach(() => {
      const review = {
        projectId: "proj1",
        projectName: "Test Project",
        userAddress: "user1",
        rating: 5,
        comment: "This is a great project with excellent features",
      };
      const result = reviewService.addReview(review, "user1");
      reviewId = result.data?.id || "";
    });

    it("should allow a user to vote helpful and prevent duplicates via toggling", () => {
      // First vote
      const res1 = reviewService.voteHelpful(reviewId, "user2");
      expect(res1.success).toBe(true);
      expect(res1.data?.helpfulVotes).toContain("user2");
      expect(res1.data?.helpfulVotes).toHaveLength(1);

      // Second vote (toggles/removes the vote, thus preventing duplicates)
      const res2 = reviewService.voteHelpful(reviewId, "user2");
      expect(res2.success).toBe(true);
      expect(res2.data?.helpfulVotes).not.toContain("user2");
      expect(res2.data?.helpfulVotes).toHaveLength(0);
    });

    it("should remove unhelpful vote when voting helpful", () => {
      // Vote unhelpful
      reviewService.voteUnhelpful(reviewId, "user2");
      let reviews = reviewService.getReviews();
      expect(reviews[0].unhelpfulVotes).toContain("user2");

      // Vote helpful
      const res = reviewService.voteHelpful(reviewId, "user2");
      expect(res.success).toBe(true);
      expect(res.data?.helpfulVotes).toContain("user2");
      expect(res.data?.unhelpfulVotes).not.toContain("user2");
    });
  });
});
