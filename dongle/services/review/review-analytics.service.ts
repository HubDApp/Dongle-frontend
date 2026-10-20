const VIEW_COUNTS_KEY = "dongle_review_view_counts";
const SESSION_VIEWS_KEY = "dongle_review_views_this_session";

function readViewCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(VIEW_COUNTS_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([id, count]) => id.length > 0 && typeof count === "number" && Number.isFinite(count) && count >= 0,
      ),
    );
  } catch {
    return {};
  }
}

export const reviewAnalyticsService = {
  getViewCounts(): Record<string, number> {
    return readViewCounts();
  },

  recordViews(reviewIds: string[]): void {
    if (typeof window === "undefined") return;

    try {
      const parsed: unknown = JSON.parse(sessionStorage.getItem(SESSION_VIEWS_KEY) ?? "[]");
      const seen = new Set(
        Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [],
      );
      const newIds = [...new Set(reviewIds)].filter((id) => id && !seen.has(id));
      if (newIds.length === 0) return;

      const counts = readViewCounts();
      for (const id of newIds) {
        counts[id] = (counts[id] ?? 0) + 1;
        seen.add(id);
      }
      localStorage.setItem(VIEW_COUNTS_KEY, JSON.stringify(counts));
      sessionStorage.setItem(SESSION_VIEWS_KEY, JSON.stringify([...seen]));
    } catch {
      // Analytics storage is best-effort and must not interrupt review browsing.
    }
  },
};