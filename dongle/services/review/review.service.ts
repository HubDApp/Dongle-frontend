import { Review, REVIEW_CONSTRAINTS, ReviewValidationError, reviewSchema } from "@/types/review";
import { generateId } from "@/lib/id-generator";
import { reviewApiService } from "./review-api.service";

const STORAGE_KEY = "dongle_reviews";

const DEV_MODE_WARN =
  "[Dongle Review Service] Using localStorage (DEV-ONLY). " +
  "Reviews will NOT persist across browsers/devices. " +
  "Set NEXT_PUBLIC_REVIEW_PERSISTENCE=api for API persistence.";

function getPersistenceMode(): "local" | "api" {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_REVIEW_PERSISTENCE === "api") {
    return "api";
  }
  return "local";
}

function validateReview(
  rating: number,
  comment: string,
): ReviewValidationError[] {
  const errors: ReviewValidationError[] = [];
  if (!Number.isInteger(rating) || rating < REVIEW_CONSTRAINTS.RATING_MIN || rating > REVIEW_CONSTRAINTS.RATING_MAX) {
    errors.push({
      field: "rating",
      message: `Rating must be an integer between ${REVIEW_CONSTRAINTS.RATING_MIN} and ${REVIEW_CONSTRAINTS.RATING_MAX}`,
    });
  }
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

function getLocalReviews(): Review[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const validatedReviews: Review[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.projectId !== "string" || !record.projectId) continue;
    if (typeof record.userAddress !== "string" || !record.userAddress) continue;
    const rawRating = Number(record.rating);
    if (isNaN(rawRating)) continue;
    const rating = Math.max(1, Math.min(5, Math.round(rawRating)));
    if (typeof record.comment !== "string") continue;
    const id = typeof record.id === "string" && record.id ? record.id : generateId();
    const projectName = typeof record.projectName === "string" && record.projectName ? record.projectName : "Unknown Project";
    let createdAt: string;
    if (typeof record.createdAt === "string" && !isNaN(Date.parse(record.createdAt))) {
      createdAt = record.createdAt;
    } else {
      createdAt = new Date().toISOString();
    }
    const review: Review = { id, projectId: record.projectId, projectName, userAddress: record.userAddress, rating, comment: record.comment, createdAt };
    if (Array.isArray(record.helpfulVotes)) {
      review.helpfulVotes = record.helpfulVotes.filter((v): v is string => typeof v === "string");
    } else {
      review.helpfulVotes = [];
    }
    if (Array.isArray(record.unhelpfulVotes)) {
      review.unhelpfulVotes = record.unhelpfulVotes.filter((v): v is string => typeof v === "string");
    } else {
      review.unhelpfulVotes = [];
    }
    validatedReviews.push(review);
  }
  return validatedReviews;
}

function saveLocalReviews(reviews: Review[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

function warnDevMode(): void {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.warn(DEV_MODE_WARN);
  }
}

async function getReviews(): Promise<Review[]> {
  if (getPersistenceMode() === "api") {
    try {
      return await reviewApiService.getReviews();
    } catch {
      if (typeof window !== "undefined") {
        console.warn(DEV_MODE_WARN);
      }
    }
  }
  warnDevMode();
  return getLocalReviews();
}

async function addReview(
  review: Omit<Review, "id" | "createdAt">,
  userAddress: string,
): Promise<{ success: boolean; data?: Review; errors?: ReviewValidationError[] }> {
  const validationErrors = validateReview(review.rating, review.comment);
  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  if (getPersistenceMode() === "api") {
    try {
      return await reviewApiService.addReview(review, userAddress);
    } catch {
      if (typeof window !== "undefined") {
        console.warn(DEV_MODE_WARN);
      }
    }
  }

  warnDevMode();
  const reviews = getLocalReviews();
  if (reviews.some((r) => r.userAddress === userAddress && r.projectId === review.projectId)) {
    return { success: false, errors: [{ field: "comment", message: "You have already reviewed this project" }] };
  }
  const newReview: Review = { ...review, userAddress, id: generateId(), createdAt: new Date().toISOString() };
  saveLocalReviews([newReview, ...reviews]);
  return { success: true, data: newReview };
}

async function updateReview(
  id: string,
  updates: Partial<Pick<Review, "rating" | "comment">>,
  userAddress: string,
): Promise<{ success: boolean; data?: Review; errors?: ReviewValidationError[] }> {
  if (getPersistenceMode() === "api") {
    try {
      return await reviewApiService.updateReview(id, updates, userAddress);
    } catch {
      if (typeof window !== "undefined") {
        console.warn(DEV_MODE_WARN);
      }
    }
  }

  warnDevMode();
  const reviews = getLocalReviews();
  const index = reviews.findIndex((r) => r.id === id);
  if (index === -1) return { success: false, errors: [{ field: "comment", message: "Review not found" }] };
  if (reviews[index].userAddress !== userAddress) {
    return { success: false, errors: [{ field: "comment", message: "You do not have permission to edit this review" }] };
  }
  const rating = updates.rating ?? reviews[index].rating;
  const comment = updates.comment ?? reviews[index].comment;
  const validationErrors = validateReview(rating, comment);
  if (validationErrors.length > 0) return { success: false, errors: validationErrors };
  reviews[index] = { ...reviews[index], ...updates };
  saveLocalReviews(reviews);
  return { success: true, data: reviews[index] };
}

async function deleteReview(
  id: string,
  userAddress: string,
): Promise<{ success: boolean; error?: string }> {
  if (getPersistenceMode() === "api") {
    try {
      return await reviewApiService.deleteReview(id, userAddress);
    } catch {
      if (typeof window !== "undefined") {
        console.warn(DEV_MODE_WARN);
      }
    }
  }

  warnDevMode();
  const reviews = getLocalReviews();
  const review = reviews.find((r) => r.id === id);
  if (!review) return { success: false, error: "Review not found" };
  if (review.userAddress !== userAddress) {
    return { success: false, error: "You do not have permission to delete this review" };
  }
  saveLocalReviews(reviews.filter((r) => r.id !== id));
  return { success: true };
}

async function getReviewsByProject(projectId: string): Promise<Review[]> {
  if (getPersistenceMode() === "api") {
    try {
      return await reviewApiService.getReviewsByProject(projectId);
    } catch {
      if (typeof window !== "undefined") {
        console.warn(DEV_MODE_WARN);
      }
    }
  }
  warnDevMode();
  return getLocalReviews().filter((r) => r.projectId === projectId);
}

async function getReviewsByUser(userAddress: string): Promise<Review[]> {
  if (getPersistenceMode() === "api") {
    try {
      return await reviewApiService.getReviewsByUser(userAddress);
    } catch {
      if (typeof window !== "undefined") {
        console.warn(DEV_MODE_WARN);
      }
    }
  }
  warnDevMode();
  return getLocalReviews().filter((r) => r.userAddress === userAddress);
}

async function voteHelpful(
  id: string,
  userAddress: string,
): Promise<{ success: boolean; data?: Review; error?: string }> {
  warnDevMode();
  const reviews = getLocalReviews();
  const index = reviews.findIndex((r) => r.id === id);
  if (index === -1) return { success: false, error: "Review not found" };
  const review = reviews[index];
  let helpfulVotes = review.helpfulVotes || [];
  let unhelpfulVotes = review.unhelpfulVotes || [];
  if (helpfulVotes.includes(userAddress)) {
    helpfulVotes = helpfulVotes.filter((addr) => addr !== userAddress);
  } else {
    helpfulVotes = [...helpfulVotes, userAddress];
    unhelpfulVotes = unhelpfulVotes.filter((addr) => addr !== userAddress);
  }
  reviews[index] = { ...review, helpfulVotes, unhelpfulVotes };
  saveLocalReviews(reviews);
  return { success: true, data: reviews[index] };
}

async function voteUnhelpful(
  id: string,
  userAddress: string,
): Promise<{ success: boolean; data?: Review; error?: string }> {
  warnDevMode();
  const reviews = getLocalReviews();
  const index = reviews.findIndex((r) => r.id === id);
  if (index === -1) return { success: false, error: "Review not found" };
  const review = reviews[index];
  let helpfulVotes = review.helpfulVotes || [];
  let unhelpfulVotes = review.unhelpfulVotes || [];
  if (unhelpfulVotes.includes(userAddress)) {
    unhelpfulVotes = unhelpfulVotes.filter((addr) => addr !== userAddress);
  } else {
    unhelpfulVotes = [...unhelpfulVotes, userAddress];
    helpfulVotes = helpfulVotes.filter((addr) => addr !== userAddress);
  }
  reviews[index] = { ...review, helpfulVotes, unhelpfulVotes };
  saveLocalReviews(reviews);
  return { success: true, data: reviews[index] };
}

export const reviewService = {
  getReviews,
  addReview,
  updateReview,
  deleteReview,
  getReviewsByProject,
  getReviewsByUser,
  voteHelpful,
  voteUnhelpful,
};

export function isReviewPersistenceApi(): boolean {
  return getPersistenceMode() === "api";
}

export function getReviewPersistenceLabel(): string {
  return getPersistenceMode() === "api" ? "API" : "localStorage (DEV-ONLY)";
}
