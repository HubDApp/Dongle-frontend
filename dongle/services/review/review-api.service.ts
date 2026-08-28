import { Review, ReviewValidationError } from "@/types/review";
import { getJson, mutate } from "@/lib/data-layer";

const API_BASE = "/api/reviews";
const REVIEW_TAGS = ["reviews"];

function toErrors(
  error: string | undefined,
  fallback: string,
): ReviewValidationError[] {
  return [{ field: "comment", message: error || fallback }];
}

export const reviewApiService = {
  async getReviews(): Promise<Review[]> {
    const result = await getJson<{ success: boolean; data: Review[] }>({
      method: "GET",
      url: API_BASE,
      tags: REVIEW_TAGS,
      persist: true,
    });
    if (!result.ok || !result.data) {
      throw new Error(result.error || "Request failed");
    }
    return result.data.data;
  },

  async addReview(
    review: Omit<Review, "id" | "createdAt">,
    userAddress: string,
  ): Promise<{ success: boolean; data?: Review; errors?: ReviewValidationError[]; queued?: boolean }> {
    try {
      const result = await mutate<{ success: boolean; data?: Review; errors?: ReviewValidationError[] }>({
        method: "POST",
        url: API_BASE,
        body: { ...review, userAddress },
        headers: { "Content-Type": "application/json" },
        invalidateTags: REVIEW_TAGS,
        invalidatePrefixes: ["GET:/api/reviews"],
        queueWhenOffline: true,
        mutationType: "reviews.add",
      });

      if (result.queued) {
        return { success: true, queued: true };
      }
      if (!result.ok) {
        const payload = result.data;
        return {
          success: false,
          errors: payload?.errors || toErrors(result.error, "Failed to add review"),
        };
      }
      const payload = result.data;
      if (payload && payload.success === false) {
        return { success: false, errors: payload.errors || toErrors(undefined, "Failed to add review") };
      }
      return { success: true, data: payload?.data };
    } catch {
      return { success: false, errors: toErrors(undefined, "Network error. Please try again.") };
    }
  },

  async updateReview(
    id: string,
    updates: Partial<Pick<Review, "rating" | "comment">>,
    userAddress: string,
  ): Promise<{ success: boolean; data?: Review; errors?: ReviewValidationError[]; queued?: boolean }> {
    try {
      const result = await mutate<{ success: boolean; data?: Review; errors?: ReviewValidationError[] }>({
        method: "PUT",
        url: `${API_BASE}/${id}`,
        body: { ...updates, userAddress },
        headers: { "Content-Type": "application/json" },
        invalidateTags: REVIEW_TAGS,
        invalidatePrefixes: ["GET:/api/reviews"],
        queueWhenOffline: true,
        mutationType: "reviews.update",
      });

      if (result.queued) {
        return { success: true, queued: true };
      }
      if (!result.ok) {
        const payload = result.data;
        return {
          success: false,
          errors: payload?.errors || toErrors(result.error, "Failed to update review"),
        };
      }
      const payload = result.data;
      if (payload && payload.success === false) {
        return { success: false, errors: payload.errors || toErrors(undefined, "Failed to update review") };
      }
      return { success: true, data: payload?.data };
    } catch {
      return { success: false, errors: toErrors(undefined, "Network error. Please try again.") };
    }
  },

  async deleteReview(
    id: string,
    userAddress: string,
  ): Promise<{ success: boolean; error?: string; queued?: boolean }> {
    try {
      const result = await mutate<{ success: boolean; error?: string }>({
        method: "DELETE",
        url: `${API_BASE}/${id}?userAddress=${encodeURIComponent(userAddress)}`,
        invalidateTags: REVIEW_TAGS,
        invalidatePrefixes: ["GET:/api/reviews"],
        queueWhenOffline: true,
        mutationType: "reviews.delete",
        idempotencyKey: `reviews.delete|${id}|${userAddress}`,
      });

      if (result.queued) {
        return { success: true, queued: true };
      }
      if (!result.ok) {
        return { success: false, error: result.error || result.data?.error || "Failed to delete review" };
      }
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  },

  async getReviewsByProject(projectId: string): Promise<Review[]> {
    const result = await getJson<{ success: boolean; data: Review[] }>({
      method: "GET",
      url: API_BASE,
      params: { projectId },
      tags: REVIEW_TAGS,
      persist: true,
    });
    if (!result.ok || !result.data) {
      throw new Error(result.error || "Request failed");
    }
    return result.data.data;
  },

  async getReviewsByUser(userAddress: string): Promise<Review[]> {
    const result = await getJson<{ success: boolean; data: Review[] }>({
      method: "GET",
      url: API_BASE,
      params: { userAddress },
      tags: REVIEW_TAGS,
      persist: true,
    });
    if (!result.ok || !result.data) {
      throw new Error(result.error || "Request failed");
    }
    return result.data.data;
  },
};
