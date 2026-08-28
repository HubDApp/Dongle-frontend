import type { DedupMetrics } from "./types";

const counters = {
  requestCount: 0,
  deduplicatedCount: 0,
  networkCount: 0,
};

export function recordRequest(): void {
  counters.requestCount += 1;
}

export function recordDeduplicated(): void {
  counters.deduplicatedCount += 1;
}

export function recordNetwork(): void {
  counters.networkCount += 1;
}

export function getDedupMetrics(): DedupMetrics {
  const { requestCount, deduplicatedCount, networkCount } = counters;
  return {
    requestCount,
    deduplicatedCount,
    networkCount,
    deduplicationRate: requestCount === 0 ? 0 : deduplicatedCount / requestCount,
  };
}

export function resetDedupMetrics(): void {
  counters.requestCount = 0;
  counters.deduplicatedCount = 0;
  counters.networkCount = 0;
}
