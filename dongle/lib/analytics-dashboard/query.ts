import { computeAnalytics, type AnalyticsFilters, type AnalyticsResult } from "./metrics";
import { cacheIsFresh, getAnalyticsCache, setAnalyticsCache } from "./cache";
import { loadAnalyticsDataset, withRetry } from "./soroban";

export async function refreshAnalyticsCache(now = new Date()) {
  const loaded = await withRetry(() => loadAnalyticsDataset());
  const generatedAt = now.toISOString();
  setAnalyticsCache({
    dataset: loaded.dataset,
    generatedAt,
    source: loaded.source,
    rpcError: loaded.rpcError,
  });
  return getAnalyticsCache()!;
}

export async function getOrRefreshAnalytics(now = new Date()) {
  if (!cacheIsFresh(now)) {
    try {
      await refreshAnalyticsCache(now);
    } catch (error) {
      const existing = getAnalyticsCache();
      if (existing) {
        return {
          ...existing,
          rpcError:
            existing.rpcError ??
            (error instanceof Error ? error.message : "Cache refresh failed"),
        };
      }
      throw error;
    }
  }
  return getAnalyticsCache()!;
}

export async function queryAnalytics(filters: AnalyticsFilters): Promise<{
  result: AnalyticsResult;
  generatedAt: string;
  source: "catalog" | "soroban" | "mixed";
  rpcError?: string;
  stale: boolean;
}> {
  const now = filters.now ?? new Date();
  const cache = await getOrRefreshAnalytics(now);
  return {
    result: computeAnalytics(cache.dataset, { ...filters, now }),
    generatedAt: cache.generatedAt,
    source: cache.source,
    rpcError: cache.rpcError,
    stale: !cacheIsFresh(now),
  };
}
