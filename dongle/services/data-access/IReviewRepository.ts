/**
 * IReviewRepository
 *
 * Repository abstraction for review data access.
 * Swap local-storage, API, or on-chain implementations transparently.
 */

import { Review } from "@/types/review";

export interface IReviewRepository {
  /** Return all reviews across all projects. */
  getAll(): Promise<Review[]>;

  /** Return a single review by ID, or null when not found. */
  getById(id: string): Promise<Review | null>;

  /** Return all reviews for a given project. */
  getByProject(projectId: string): Promise<Review[]>;

  /** Return all reviews submitted by a given wallet address. */
  getByUser(userAddress: string): Promise<Review[]>;

  /** Persist a new review and return the saved record (with generated id/createdAt). */
  create(review: Omit<Review, "id" | "createdAt">): Promise<Review>;

  /** Update mutable fields of an existing review by ID. */
  update(id: string, changes: Partial<Pick<Review, "rating" | "comment">>): Promise<Review | null>;

  /** Remove a review by ID. Returns true when deleted, false when not found. */
  delete(id: string): Promise<boolean>;
}
