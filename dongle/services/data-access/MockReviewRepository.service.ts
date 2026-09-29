/**
 * MockReviewRepository
 *
 * localStorage-backed implementation of IReviewRepository.
 * Mirrors the persistence strategy already used by reviewService so
 * existing data carries over seamlessly.  Replace with an API-backed
 * implementation when a real backend is available.
 *
 * All persisted records carry a `_schemaVersion` field (see migration.ts)
 * so that future shape changes can be migrated automatically on load.
 */

import { IReviewRepository } from "./IReviewRepository.service";
import { Review } from "@/types/review";
import { generateId } from "@/lib/id-generator";
import { stamp, migrateRecordArray, VersionedRecord } from "./migration.service";

const STORAGE_KEY = "dongle_reviews";

type VersionedReview = Review & VersionedRecord;

function load(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Apply schema migrations before validating shape
    const migrated = migrateRecordArray<VersionedReview>(parsed, /* warnOnSkip */ true);

    const valid: Review[] = [];
    for (const item of migrated) {
      if (typeof item.id !== "string") continue;
      if (typeof item.projectId !== "string") continue;
      if (typeof item.userAddress !== "string") continue;
      if (typeof item.rating !== "number") continue;
      if (typeof item.comment !== "string") continue;
      valid.push({
        id: item.id,
        projectId: item.projectId,
        projectName: typeof item.projectName === "string" ? item.projectName : "",
        userAddress: item.userAddress,
        rating: item.rating,
        comment: item.comment,
        createdAt:
          typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        helpfulVotes: Array.isArray(item.helpfulVotes)
          ? (item.helpfulVotes as unknown[]).filter((v): v is string => typeof v === "string")
          : [],
        unhelpfulVotes: Array.isArray(item.unhelpfulVotes)
          ? (item.unhelpfulVotes as unknown[]).filter((v): v is string => typeof v === "string")
          : [],
      });
    }
    return valid;
  } catch {
    return [];
  }
}

function save(reviews: Review[]): void {
  if (typeof window === "undefined") return;
  // Stamp schema version on every record before persisting
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews.map(stamp)));
}

export class MockReviewRepository implements IReviewRepository {
  async getAll(): Promise<Review[]> {
    return load();
  }

  async getById(id: string): Promise<Review | null> {
    return load().find((r) => r.id === id) ?? null;
  }

  async getByProject(projectId: string): Promise<Review[]> {
    return load().filter((r) => r.projectId === projectId);
  }

  async getByUser(userAddress: string): Promise<Review[]> {
    return load().filter((r) => r.userAddress === userAddress);
  }

  async create(review: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const reviews = load();
    const newReview: Review = {
      ...review,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    save([newReview, ...reviews]);
    return newReview;
  }

  async update(
    id: string,
    changes: Partial<Pick<Review, "rating" | "comment">>,
  ): Promise<Review | null> {
    const reviews = load();
    const idx = reviews.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    reviews[idx] = { ...reviews[idx], ...changes };
    save(reviews);
    return reviews[idx];
  }

  async delete(id: string): Promise<boolean> {
    const reviews = load();
    const next = reviews.filter((r) => r.id !== id);
    if (next.length === reviews.length) return false;
    save(next);
    return true;
  }
}
