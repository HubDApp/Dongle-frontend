import { Review, ReviewValidationError } from "@/types/review";

const API_BASE = "/api/reviews";

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.errors?.[0]?.message || "Request failed");
  }
  return data;
}

export const reviewApiService = {
  async getReviews(): Promise<Review[]> {
    const response = await fetch(API_BASE);
    const data = await handleResponse<{ success: boolean; data: Review[] }>(response);
    return data.data;
  },

  async addReview(
    review: Omit<Review, "id" | "createdAt">,
    userAddress: string,
  ): Promise<{ success: boolean; data?: Review; errors?: ReviewValidationError[] }> {
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...review, userAddress }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, errors: data.errors || [{ field: "comment", message: data.error || "Failed to add review" }] };
      }
      return { success: true, data: data.data };
    } catch {
      return { success: false, errors: [{ field: "comment", message: "Network error. Please try again." }] };
    }
  },

  async updateReview(
    id: string,
    updates: Partial<Pick<Review, "rating" | "comment">>,
    userAddress: string,
  ): Promise<{ success: boolean; data?: Review; errors?: ReviewValidationError[] }> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, userAddress }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, errors: data.errors || [{ field: "comment", message: data.error || "Failed to update review" }] };
      }
      return { success: true, data: data.data };
    } catch {
      return { success: false, errors: [{ field: "comment", message: "Network error. Please try again." }] };
    }
  },

  async deleteReview(
    id: string,
    userAddress: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/${id}?userAddress=${encodeURIComponent(userAddress)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || "Failed to delete review" };
      }
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  },

  async getReviewsByProject(projectId: string): Promise<Review[]> {
    const response = await fetch(`${API_BASE}?projectId=${encodeURIComponent(projectId)}`);
    const data = await handleResponse<{ success: boolean; data: Review[] }>(response);
    return data.data;
  },

  async getReviewsByUser(userAddress: string): Promise<Review[]> {
    const response = await fetch(`${API_BASE}?userAddress=${encodeURIComponent(userAddress)}`);
    const data = await handleResponse<{ success: boolean; data: Review[] }>(response);
    return data.data;
  },
};
