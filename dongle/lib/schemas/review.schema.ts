/**
 * Zod schema validation for review forms
 */

import { z } from "zod";
import { REVIEW_CONSTRAINTS } from "@/types/review";

export const reviewFormSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(REVIEW_CONSTRAINTS.RATING_MIN, `Rating must be at least ${REVIEW_CONSTRAINTS.RATING_MIN}`)
    .max(REVIEW_CONSTRAINTS.RATING_MAX, `Rating must be at most ${REVIEW_CONSTRAINTS.RATING_MAX}`),
  comment: z
    .string()
    .min(
      REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH,
      `Comment must be at least ${REVIEW_CONSTRAINTS.COMMENT_MIN_LENGTH} characters`
    )
    .max(
      REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH,
      `Comment cannot exceed ${REVIEW_CONSTRAINTS.COMMENT_MAX_LENGTH} characters`
    )
    .transform((val) => val.trim()),
});

export type ReviewFormData = z.infer<typeof reviewFormSchema>;
