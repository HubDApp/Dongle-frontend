export interface Review {
  id: string;
  projectId: string;
  projectName: string;
  userAddress: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
}

// Validation constraints
export const REVIEW_CONSTRAINTS = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  COMMENT_MIN_LENGTH: 10,
  COMMENT_MAX_LENGTH: 1000,
} as const;

export interface ReviewValidationError {
  field: "rating" | "comment";
  message: string;
}
