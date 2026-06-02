import { Review, REVIEW_CONSTRAINTS, ReviewValidationError } from "@/types/review";

const STORAGE_KEY = "dongle_reviews";

/**
 * Validates review data before persistence
 */
function validateReview(
  rating: number,
  comment: string
): ReviewValidationError[] {
  const errors: ReviewValidationError[] = [];

  // Validate rating
  if (!Number.isInteger(rating) || rating < REVIEW_CONSTRAINTS.RATING_MIN || rating > REVIEW_CONSTRAINTS.RATING_MAX) {
    errors.push({
      field: "rating",
      message: `Rating must be an integer between ${REVIEW_CONSTRAINTS.RATING_MIN} and ${REVIEW_CONSTRAINTS.RATING_MAX}`,
    });
  }

  // Validate comment
  if (comment.trim().length < REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH) {
    errors.push({
      field: "comment",
      message: `Comment must be at least ${REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH} characters`,
    });
  }

  if (comment.length > REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH) {
    errors.push({
      field: "comment",
      message: `Comment cannot exceed ${REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH} characters`,
    });
  }

  return errors;
}

/**
 * Checks if a user already has a review for a project
 */
function hasExistingReview(userAddress: string, projectId: string, reviews: Review[]): boolean {
  return reviews.some(
    (r) => r.userAddress === userAddress && r.projectId === projectId
  );
}

export const reviewService = {
  getReviews(): Review[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addReview(
    review: Omit<Review, "id" | "createdAt">,
    userAddress: string
  ): { success: boolean; data?: Review; errors?: ReviewValidationError[] } {
    // Validate input
    const validationErrors = validateReview(review.rating, review.comment);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const reviews = this.getReviews();

    // Check for duplicate review
    if (hasExistingReview(userAddress, review.projectId, reviews)) {
      return {
        success: false,
        errors: [
          {
            field: "comment",
            message: "You have already reviewed this project",
          },
        ],
      };
    }

    const newReview: Review = {
      ...review,
      userAddress,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    const updatedReviews = [newReview, ...reviews];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReviews));
    return { success: true, data: newReview };
  },

  updateReview(
    id: string,
    updates: Partial<Pick<Review, "rating" | "comment">>,
    userAddress: string
  ): { success: boolean; data?: Review; errors?: ReviewValidationError[] } {
    const reviews = this.getReviews();
    const index = reviews.findIndex((r) => r.id === id);

    if (index === -1) {
      return {
        success: false,
        errors: [{ field: "comment", message: "Review not found" }],
      };
    }

    // Authorization check: verify ownership
    if (reviews[index].userAddress !== userAddress) {
      return {
        success: false,
        errors: [
          {
            field: "comment",
            message: "You do not have permission to edit this review",
          },
        ],
      };
    }

    // Validate updates
    const rating = updates.rating ?? reviews[index].rating;
    const comment = updates.comment ?? reviews[index].comment;
    const validationErrors = validateReview(rating, comment);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    const updatedReview = { ...reviews[index], ...updates };
    reviews[index] = updatedReview;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    return { success: true, data: updatedReview };
  },

  deleteReview(
    id: string,
    userAddress: string
  ): { success: boolean; error?: string } {
    const reviews = this.getReviews();
    const review = reviews.find((r) => r.id === id);

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    // Authorization check: verify ownership
    if (review.userAddress !== userAddress) {
      return {
        success: false,
        error: "You do not have permission to delete this review",
      };
    }

    const updatedReviews = reviews.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReviews));
    return { success: true };
  },

  getReviewsByProject(projectId: string): Review[] {
    return this.getReviews().filter((r) => r.projectId === projectId);
  },

  getReviewsByUser(userAddress: string): Review[] {
    return this.getReviews().filter((r) => r.userAddress === userAddress);
  },
};
