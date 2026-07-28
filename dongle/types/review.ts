import { Project } from "@/types/project";
import { z } from "zod";

export interface Review {
  id: string;
  projectId: string;
  projectName: string;
  userAddress: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpfulVotes?: string[];
  unhelpfulVotes?: string[];
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

// Zod schema for review validation
export const reviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(REVIEW_CONSTRAINTS.RATING_MIN, `Rating must be at least ${REVIEW_CONSTRAINTS.RATING_MIN}`)
    .max(REVIEW_CONSTRAINTS.RATING_MAX, `Rating must be at most ${REVIEW_CONSTRAINTS.RATING_MAX}`),
  comment: z
    .string()
    .min(REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH, `Comment must be at least ${REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH} characters`)
    .max(REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH, `Comment cannot exceed ${REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH} characters`)
    .trim()
    .refine(val => val.length >= REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH, `Comment must be at least ${REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH} characters after trimming`),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

// Re-export Project for backward compatibility in components
export type { Project };

