import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { reviewService } from "@/services/review/review.service";
import { Review, REVIEW_CONSTRAINTS } from "@/types/review";

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

      reviews.forEach((review, index) => {
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
});
