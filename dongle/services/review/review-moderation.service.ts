import type {
  FlaggedReview,
  ModerationBulkAction,
  SpamStatistics,
} from "@/types/moderation";

const API_BASE = "/api/reviews/moderation";

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export const reviewModerationService = {
  async getQueue(status?: "pending" | "approved" | "rejected"): Promise<FlaggedReview[]> {
    const qs = status ? `?status=${status}` : "";
    const res = await fetch(`${API_BASE}${qs}`);
    if (!res.ok) return [];
    const body = await parseJson<{ data: FlaggedReview[] }>(res);
    return body.data ?? [];
  },

  async getStats(): Promise<SpamStatistics | null> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) return null;
    const body = await parseJson<{ data: SpamStatistics }>(res);
    return body.data ?? null;
  },

  async bulkAction(
    flaggedIds: string[],
    action: ModerationBulkAction,
    moderatorAddress: string,
    reason?: string,
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flaggedIds, action, moderatorAddress, reason }),
    });
    if (!res.ok) return { succeeded: [], failed: flaggedIds };
    return parseJson<{ succeeded: string[]; failed: string[] }>(res);
  },

  async checkVelocity(userAddress: string): Promise<{
    dailyCount: number;
    requiresCaptcha: boolean;
    banned: boolean;
  }> {
    const res = await fetch(
      `/api/reviews/velocity?userAddress=${encodeURIComponent(userAddress)}`,
    );
    if (!res.ok) {
      return { dailyCount: 0, requiresCaptcha: false, banned: false };
    }
    return parseJson(res);
  },
};
