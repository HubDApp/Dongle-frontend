import { Review, REVIEW_CONSTRAINTS, ReviewValidationError } from "@/types/review";
import { generateId } from "@/lib/id-generator";

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
    if (!stored) return [];

    let parsed: any;
    try {
      parsed = JSON.parse(stored);
    } catch (e) {
      return [];
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    const validatedReviews: Review[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        continue;
      }

      // Must have projectId and userAddress as strings
      if (typeof item.projectId !== "string" || !item.projectId) {
        continue;
      }
      if (typeof item.userAddress !== "string" || !item.userAddress) {
        continue;
      }

      // Rating must be a number
      const rawRating = Number(item.rating);
      if (isNaN(rawRating)) {
        continue;
      }
      const rating = Math.max(1, Math.min(5, Math.round(rawRating)));

      // Comment must be a string
      if (typeof item.comment !== "string") {
        continue;
      }

      // Migrate / fallback fields
      const id = typeof item.id === "string" && item.id ? item.id : generateId();
      const projectName = typeof item.projectName === "string" && item.projectName ? item.projectName : "Unknown Project";
      
      let createdAt = item.createdAt;
      if (typeof createdAt !== "string" || isNaN(Date.parse(createdAt))) {
        createdAt = new Date().toISOString();
      }

      const review: Review = {
        id,
        projectId: item.projectId,
        projectName,
        userAddress: item.userAddress,
        rating,
        comment: item.comment,
        createdAt,
      };

      // Support for helpful/unhelpful votes for task 3
      if (Array.isArray(item.helpfulVotes)) {
        (review as any).helpfulVotes = item.helpfulVotes.filter((v: any) => typeof v === "string");
      } else {
        (review as any).helpfulVotes = [];
      }

      if (Array.isArray(item.unhelpfulVotes)) {
        (review as any).unhelpfulVotes = item.unhelpfulVotes.filter((v: any) => typeof v === "string");
      } else {
        (review as any).unhelpfulVotes = [];
      }

      validatedReviews.push(review);
    }

    return validatedReviews;
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
      id: generateId(),
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

  voteHelpful(id: string, userAddress: string): { success: boolean; data?: Review; error?: string } {
    const reviews = this.getReviews();
    const index = reviews.findIndex((r) => r.id === id);

    if (index === -1) {
      return { success: false, error: "Review not found" };
    }

    const review = reviews[index];
    let helpfulVotes = review.helpfulVotes || [];
    let unhelpfulVotes = review.unhelpfulVotes || [];

    if (helpfulVotes.includes(userAddress)) {
      helpfulVotes = helpfulVotes.filter((addr) => addr !== userAddress);
    } else {
      helpfulVotes = [...helpfulVotes, userAddress];
      unhelpfulVotes = unhelpfulVotes.filter((addr) => addr !== userAddress);
    }

    const updatedReview = {
      ...review,
      helpfulVotes,
      unhelpfulVotes,
    };

    reviews[index] = updatedReview;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    return { success: true, data: updatedReview };
  },

  voteUnhelpful(id: string, userAddress: string): { success: boolean; data?: Review; error?: string } {
    const reviews = this.getReviews();
    const index = reviews.findIndex((r) => r.id === id);

    if (index === -1) {
      return { success: false, error: "Review not found" };
    }

    const review = reviews[index];
    let helpfulVotes = review.helpfulVotes || [];
    let unhelpfulVotes = review.unhelpfulVotes || [];

    if (unhelpfulVotes.includes(userAddress)) {
      unhelpfulVotes = unhelpfulVotes.filter((addr) => addr !== userAddress);
    } else {
      unhelpfulVotes = [...unhelpfulVotes, userAddress];
      helpfulVotes = helpfulVotes.filter((addr) => addr !== userAddress);
    }

    const updatedReview = {
      ...review,
      helpfulVotes,
      unhelpfulVotes,
    };

    reviews[index] = updatedReview;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    return { success: true, data: updatedReview };
  },
};
