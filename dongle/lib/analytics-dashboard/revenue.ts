/**
 * Verification fee revenue analytics (Issue #716).
 *
 * Computes revenue totals, tier breakdowns, average transaction value, MRR and
 * a simple linear-regression forecast for the next three months.
 */

import { toCsv } from "@/lib/analytics-dashboard/csv";
import { VERIFICATION_TIERS, type VerificationTier } from "@/types/project";

export interface VerificationFee {
  id: string;
  projectId: string;
  projectName: string;
  tier: VerificationTier;
  amountXlm: number;
  createdAt: string; // ISO date
}

/** Base fee charged per verification tier, in XLM. */
export const TIER_BASE_FEES_XLM: Record<VerificationTier, number> = {
  BRONZE: 50,
  SILVER: 150,
  GOLD: 400,
};

/** Fallback XLM→USD rate used when no oracle value is provided. */
export const DEFAULT_XLM_USD_RATE = 0.42;

export interface RevenueTierBreakdown {
  tier: VerificationTier;
  count: number;
  xlm: number;
  usd: number;
}

export interface RevenuePoint {
  month: string; // YYYY-MM
  xlm: number;
  usd: number;
}

export interface RevenueForecastPoint extends RevenuePoint {
  projected: true;
}

export interface RevenueReport {
  totalXlm: number;
  totalUsd: number;
  averageTransactionXlm: number;
  averageTransactionUsd: number;
  monthlyRecurringUsd: number;
  byTier: RevenueTierBreakdown[];
  monthly: RevenuePoint[];
  forecast: RevenueForecastPoint[];
  xlmUsdRate: number;
  generatedAt: string;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= last) {
    keys.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

/** Least-squares linear regression; returns slope and intercept. */
export function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((sum, y) => sum + y, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = values.reduce((sum, _y, x) => sum + x * x, 0);
  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Forecast the next `months` months using a linear trend over the observed
 * monthly points. Projections are clamped at zero.
 */
export function forecastRevenue(
  monthly: RevenuePoint[],
  months = 3,
  xlmUsdRate = DEFAULT_XLM_USD_RATE,
): RevenueForecastPoint[] {
  const { slope, intercept } = linearRegression(monthly.map((p) => p.xlm));
  const n = monthly.length;
  const lastMonth = monthly.length > 0 ? monthly[monthly.length - 1].month : monthKey(new Date());
  const [yearStr, monthStr] = lastMonth.split("-");
  const cursor = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));

  const forecast: RevenueForecastPoint[] = [];
  for (let i = 1; i <= months; i += 1) {
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    const xlm = Math.max(0, intercept + slope * (n - 1 + i));
    forecast.push({
      month: monthKey(cursor),
      xlm,
      usd: xlm * xlmUsdRate,
      projected: true,
    });
  }
  return forecast;
}

export function computeRevenue(
  fees: VerificationFee[],
  xlmUsdRate: number = DEFAULT_XLM_USD_RATE,
  now: Date = new Date(),
): RevenueReport {
  const totalXlm = fees.reduce((sum, fee) => sum + fee.amountXlm, 0);

  const byTierMap = new Map<VerificationTier, RevenueTierBreakdown>();
  for (const tier of VERIFICATION_TIERS) {
    byTierMap.set(tier, { tier, count: 0, xlm: 0, usd: 0 });
  }
  const monthlyMap = new Map<string, RevenuePoint>();

  for (const fee of fees) {
    const breakdown = byTierMap.get(fee.tier)!;
    breakdown.count += 1;
    breakdown.xlm += fee.amountXlm;
    breakdown.usd += fee.amountXlm * xlmUsdRate;

    const key = fee.createdAt.slice(0, 7);
    const point = monthlyMap.get(key) ?? { month: key, xlm: 0, usd: 0 };
    point.xlm += fee.amountXlm;
    point.usd += fee.amountXlm * xlmUsdRate;
    monthlyMap.set(key, point);
  }

  const earliest = fees.reduce(
    (acc, fee) => {
      const date = new Date(fee.createdAt);
      return date < acc ? date : acc;
    },
    now,
  );
  const monthlyKeys = monthsBetween(earliest, now);
  const monthly: RevenuePoint[] = monthlyKeys.map(
    (key) => monthlyMap.get(key) ?? { month: key, xlm: 0, usd: 0 },
  );

  // MRR: revenue booked in the current calendar month, annualised implicitly by
  // treating each month's verification fees as recurring.
  const currentKey = monthKey(now);
  const currentMonth = monthly.find((point) => point.month === currentKey);
  const monthlyRecurringUsd = currentMonth?.usd ?? 0;

  return {
    totalXlm,
    totalUsd: totalXlm * xlmUsdRate,
    averageTransactionXlm: fees.length > 0 ? totalXlm / fees.length : 0,
    averageTransactionUsd: fees.length > 0 ? (totalXlm * xlmUsdRate) / fees.length : 0,
    monthlyRecurringUsd,
    byTier: VERIFICATION_TIERS.map((tier) => byTierMap.get(tier)!),
    monthly,
    forecast: forecastRevenue(monthly, 3, xlmUsdRate),
    xlmUsdRate,
    generatedAt: now.toISOString(),
  };
}

/**
 * Deterministic sample fee history so the dashboard renders without a backend.
 * Mirrors the shape returned by the Verifications API.
 */
export function buildSampleFees(now: Date = new Date(), months = 9): VerificationFee[] {
  const fees: VerificationFee[] = [];
  const tierSequence: VerificationTier[] = ["BRONZE", "SILVER", "GOLD"];
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  for (let m = months - 1; m >= 0; m -= 1) {
    const count = 6 + Math.floor(rand() * 10);
    for (let i = 0; i < count; i += 1) {
      const tier = tierSequence[Math.floor(rand() * tierSequence.length)];
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1 + Math.floor(rand() * 27)),
      );
      fees.push({
        id: `fee-${m}-${i}`,
        projectId: `project-${m}-${i}`,
        projectName: `Project ${m}-${i}`,
        tier,
        amountXlm: TIER_BASE_FEES_XLM[tier],
        createdAt: date.toISOString(),
      });
    }
  }
  return fees;
}

export function toRevenueCsv(report: RevenueReport): string {
  const rows: Array<Array<string | number>> = [];

  const summary: Array<[string, string | number]> = [
    ["total_xlm", report.totalXlm.toFixed(2)],
    ["total_usd", report.totalUsd.toFixed(2)],
    ["average_transaction_xlm", report.averageTransactionXlm.toFixed(2)],
    ["average_transaction_usd", report.averageTransactionUsd.toFixed(2)],
    ["monthly_recurring_usd", report.monthlyRecurringUsd.toFixed(2)],
    ["xlm_usd_rate", report.xlmUsdRate],
  ];
  for (const [key, value] of summary) rows.push(["summary", key, value]);

  for (const tier of report.byTier) {
    rows.push(["tier", `${tier.tier}_count`, tier.count]);
    rows.push(["tier", `${tier.tier}_xlm`, tier.xlm.toFixed(2)]);
    rows.push(["tier", `${tier.tier}_usd`, tier.usd.toFixed(2)]);
  }
  for (const point of report.monthly) {
    rows.push(["month", point.month, point.xlm.toFixed(2)]);
  }
  for (const point of report.forecast) {
    rows.push(["forecast", point.month, point.xlm.toFixed(2)]);
  }

  return toCsv(["section", "key", "value"], rows);
}
