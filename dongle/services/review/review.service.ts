import { Review } from "@/types/review";

const STORAGE_KEY = "dongle_reviews";

export const reviewService = {
  getReviews(): Review[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addReview(review: Omit<Review, "id" | "createdAt">): Review {
    const reviews = this.getReviews();
    const newReview: Review = {
      ...review,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    const updatedReviews = [newReview, ...reviews];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReviews));
    return newReview;
  },

  updateReview(id: string, updates: Partial<Pick<Review, "rating" | "comment">>): Review {
    const reviews = this.getReviews();
    const index = reviews.findIndex((r) => r.id === id);
    if (index === -1) throw new Error("Review not found");

    const updatedReview = { ...reviews[index], ...updates };
    reviews[index] = updatedReview;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    return updatedReview;
  },

  deleteReview(id: string): void {
    const reviews = this.getReviews().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  },

  getReviewsByProject(projectId: string): Review[] {
    return this.getReviews().filter((r) => r.projectId === projectId);
  },

  getReviewsByUser(userAddress: string): Review[] {
    return this.getReviews().filter((r) => r.userAddress === userAddress);
  }
};
