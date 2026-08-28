/**
 * Daily analytics cache (00:00 UTC).
 *
 * The cache stores the aggregated dataset (not a single filter view) so
 * dashboard filters can be applied without recomputing from Soroban.
 * Entries remain valid until the next UTC midnight after `generatedAt`.
 */

import { isCacheFresh, type AnalyticsDataset } from "./metrics";

export interface AnalyticsCacheEntry {
  dataset: AnalyticsDataset;
  generatedAt: string;
  source: "catalog" | "soroban" | "mixed";
  rpcError?: string;
}

let entry: AnalyticsCacheEntry | null = null;

export function getAnalyticsCache(): AnalyticsCacheEntry | null {
  return entry;
}

export function setAnalyticsCache(next: AnalyticsCacheEntry): void {
  entry = next;
}

export function clearAnalyticsCache(): void {
  entry = null;
}

export function cacheIsFresh(now = new Date()): boolean {
  if (!entry) return false;
  return isCacheFresh(entry.generatedAt, now);
}
