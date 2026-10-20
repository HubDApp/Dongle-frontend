/**
 * Stellar/Soroban network health & RPC performance monitoring (Issue #717).
 *
 * Derives latency percentiles, transaction success rate, failure reasons and
 * congestion indicators from a window of RPC samples, and raises alerts when
 * thresholds are breached.
 */

export interface RpcSample {
  method: string;
  latencyMs: number;
  success: boolean;
  /** Failure reason when `success` is false. */
  errorReason?: string;
  timestamp: string; // ISO
}

export type CongestionLevel = "low" | "moderate" | "high";

export interface LatencyStats {
  count: number;
  average: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface FailureReason {
  reason: string;
  count: number;
}

export interface NetworkAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

export interface StatusPageSummary {
  status: "operational" | "degraded" | "outage";
  description: string;
  url: string | null;
  updatedAt: string;
}

export interface NetworkHealthPoint {
  timestamp: string;
  p95: number;
  successRate: number;
}

export interface NetworkHealthSnapshot {
  latency: LatencyStats;
  successRate: number;
  failures: FailureReason[];
  congestion: CongestionLevel;
  congestionScore: number;
  alerts: NetworkAlert[];
  statusPage: StatusPageSummary;
  series: NetworkHealthPoint[];
  sampleCount: number;
  generatedAt: string;
}

export interface NetworkThresholds {
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
}

export const DEFAULT_THRESHOLDS: NetworkThresholds = {
  p95LatencyMs: 1500,
  p99LatencyMs: 3000,
  successRate: 0.95,
};

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function computeLatencyStats(samples: RpcSample[]): LatencyStats {
  const latencies = samples.map((s) => s.latencyMs).filter((n) => Number.isFinite(n));
  if (latencies.length === 0) {
    return { count: 0, average: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  }
  return {
    count: latencies.length,
    average: latencies.reduce((sum, n) => sum + n, 0) / latencies.length,
    max: Math.max(...latencies),
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  };
}

export function computeFailureReasons(samples: RpcSample[]): FailureReason[] {
  const counts = new Map<string, number>();
  for (const sample of samples) {
    if (sample.success) continue;
    const reason = sample.errorReason ?? "unknown";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Congestion score in [0, 1] blending slow-RPC ratio and failure ratio.
 */
export function computeCongestionScore(
  samples: RpcSample[],
  thresholds: NetworkThresholds = DEFAULT_THRESHOLDS,
): number {
  if (samples.length === 0) return 0;
  const slow = samples.filter((s) => s.latencyMs > thresholds.p95LatencyMs).length;
  const failed = samples.filter((s) => !s.success).length;
  return Math.min(1, (slow / samples.length) * 0.5 + (failed / samples.length) * 0.5);
}

export function congestionLevel(score: number): CongestionLevel {
  if (score >= 0.5) return "high";
  if (score >= 0.2) return "moderate";
  return "low";
}

export function evaluateAlerts(
  latency: LatencyStats,
  successRate: number,
  thresholds: NetworkThresholds = DEFAULT_THRESHOLDS,
): NetworkAlert[] {
  const alerts: NetworkAlert[] = [];

  if (latency.p95 > thresholds.p95LatencyMs) {
    alerts.push({
      id: "rpc-p95",
      severity: latency.p95 > thresholds.p95LatencyMs * 1.5 ? "critical" : "warning",
      metric: "rpc_p95_latency_ms",
      value: Math.round(latency.p95),
      threshold: thresholds.p95LatencyMs,
      message: `RPC p95 latency is ${Math.round(latency.p95)}ms (threshold ${thresholds.p95LatencyMs}ms)`,
    });
  }

  if (latency.p99 > thresholds.p99LatencyMs) {
    alerts.push({
      id: "rpc-p99",
      severity: "warning",
      metric: "rpc_p99_latency_ms",
      value: Math.round(latency.p99),
      threshold: thresholds.p99LatencyMs,
      message: `RPC p99 latency is ${Math.round(latency.p99)}ms (threshold ${thresholds.p99LatencyMs}ms)`,
    });
  }

  if (successRate < thresholds.successRate) {
    alerts.push({
      id: "tx-success",
      severity: successRate < thresholds.successRate - 0.05 ? "critical" : "warning",
      metric: "transaction_success_rate",
      value: Number(successRate.toFixed(4)),
      threshold: thresholds.successRate,
      message: `Transaction success rate dropped to ${(successRate * 100).toFixed(1)}% (threshold ${(thresholds.successRate * 100).toFixed(0)}%)`,
    });
  }

  return alerts;
}

export function buildStatusPageSummary(
  latency: LatencyStats,
  successRate: number,
  alerts: NetworkAlert[],
  now: Date = new Date(),
): StatusPageSummary {
  const critical = alerts.some((alert) => alert.severity === "critical");
  const warning = alerts.some((alert) => alert.severity === "warning");
  const status = critical ? "outage" : warning ? "degraded" : "operational";
  const description =
    status === "operational"
      ? "All Stellar/Soroban RPC endpoints are operating normally."
      : status === "degraded"
        ? "Elevated RPC latency or transaction failures detected."
        : "Significant RPC degradation or transaction failures detected.";

  return {
    status,
    description,
    url: process.env.NEXT_PUBLIC_STATUS_PAGE_URL ?? null,
    updatedAt: now.toISOString(),
  };
}

function buildSeries(samples: RpcSample[], buckets = 12): NetworkHealthPoint[] {
  if (samples.length === 0) return [];
  const ordered = [...samples].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const start = new Date(ordered[0].timestamp).getTime();
  const end = new Date(ordered[ordered.length - 1].timestamp).getTime();
  const span = Math.max(1, end - start);
  const size = span / buckets;

  const result: NetworkHealthPoint[] = [];
  for (let i = 0; i < buckets; i += 1) {
    const from = start + i * size;
    const to = i === buckets - 1 ? end + 1 : start + (i + 1) * size;
    const bucket = ordered.filter((s) => {
      const t = new Date(s.timestamp).getTime();
      return t >= from && t < to;
    });
    if (bucket.length === 0) continue;
    const successes = bucket.filter((s) => s.success).length;
    result.push({
      timestamp: new Date(from).toISOString(),
      p95: percentile(bucket.map((s) => s.latencyMs), 95),
      successRate: successes / bucket.length,
    });
  }
  return result;
}

export function computeNetworkHealth(
  samples: RpcSample[],
  thresholds: NetworkThresholds = DEFAULT_THRESHOLDS,
  now: Date = new Date(),
): NetworkHealthSnapshot {
  const latency = computeLatencyStats(samples);
  const successes = samples.filter((s) => s.success).length;
  const successRate = samples.length > 0 ? successes / samples.length : 1;
  const congestionScore = computeCongestionScore(samples, thresholds);
  const alerts = evaluateAlerts(latency, successRate, thresholds);

  return {
    latency,
    successRate,
    failures: computeFailureReasons(samples),
    congestion: congestionLevel(congestionScore),
    congestionScore,
    alerts,
    statusPage: buildStatusPageSummary(latency, successRate, alerts, now),
    series: buildSeries(samples),
    sampleCount: samples.length,
    generatedAt: now.toISOString(),
  };
}

const ERROR_REASONS = [
  "tx_too_late",
  "insufficient_fee",
  "contract_trap",
  "rpc_timeout",
  "network_error",
] as const;

const METHODS = ["simulateTransaction", "sendTransaction", "getLedgerEntries", "getLatestLedger"] as const;

/** Deterministic sample RPC telemetry for local/demo dashboards. */
export function buildSampleSamples(now: Date = new Date(), count = 240): RpcSample[] {
  const samples: RpcSample[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const windowMs = 6 * 60 * 60 * 1000; // last 6 hours
  for (let i = 0; i < count; i += 1) {
    const r = rand();
    // Shape the distribution: most calls fast, a meaningful tail slow.
    const latencyMs =
      r > 0.97 ? 2500 + rand() * 2500 : r > 0.85 ? 900 + rand() * 1400 : 120 + rand() * 600;
    const success = rand() > 0.06;
    samples.push({
      method: METHODS[Math.floor(rand() * METHODS.length)],
      latencyMs,
      success,
      errorReason: success
        ? undefined
        : ERROR_REASONS[Math.floor(rand() * ERROR_REASONS.length)],
      timestamp: new Date(now.getTime() - windowMs + (windowMs / count) * i).toISOString(),
    });
  }
  return samples;
}
