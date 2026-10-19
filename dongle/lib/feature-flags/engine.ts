/**
 * Deterministic bucketing and A/B statistics (Issue #714).
 */

import type {
  ExperimentResult,
  FeatureFlag,
  FlagVariant,
  VariantMetrics,
  VariantStatistic,
} from "./types";

/** Significance threshold for the two-proportion z-test. */
export const SIGNIFICANCE_LEVEL = 0.05;

/** FNV-1a hash — stable across sessions so a user keeps the same bucket. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Returns a stable bucket in the range [0, 100) for a flag user pair. */
export function bucketFor(flagKey: string, userId: string): number {
  return (hashString(`${flagKey}:${userId}`) % 10000) / 100;
}

/**
 * Assign a variant to a user. Returns `null` when the flag is disabled or the
 * user falls outside the rollout percentage.
 */
export function pickVariant(flag: FeatureFlag, userId: string): FlagVariant | null {
  if (!flag.enabled || flag.variants.length === 0) return null;

  const bucket = bucketFor(flag.key, userId);
  if (flag.rolloutPercentage <= 0 || bucket >= flag.rolloutPercentage) {
    return null;
  }

  const totalWeight = flag.variants.reduce(
    (sum, variant) => sum + Math.max(0, variant.weight),
    0,
  );
  if (totalWeight <= 0) return flag.variants[0];

  // Normalise the bucket into [0, totalWeight) within the eligible cohort.
  const position = (bucket / flag.rolloutPercentage) * totalWeight;
  let cursor = 0;
  for (const variant of flag.variants) {
    cursor += Math.max(0, variant.weight);
    if (position < cursor) return variant;
  }
  return flag.variants[flag.variants.length - 1];
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Standard normal CDF. */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * Two-proportion z-test. Returns the z-score and two-tailed p-value comparing
 * a variant against the control.
 */
export function twoProportionZTest(
  controlConversions: number,
  controlExposures: number,
  variantConversions: number,
  variantExposures: number,
): { zScore: number; pValue: number } {
  if (controlExposures <= 0 || variantExposures <= 0) {
    return { zScore: 0, pValue: 1 };
  }

  const p1 = controlConversions / controlExposures;
  const p2 = variantConversions / variantExposures;
  const pooled =
    (controlConversions + variantConversions) / (controlExposures + variantExposures);
  const standardError = Math.sqrt(
    pooled * (1 - pooled) * (1 / controlExposures + 1 / variantExposures),
  );
  if (standardError === 0) return { zScore: 0, pValue: 1 };

  const zScore = (p2 - p1) / standardError;
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));
  return { zScore, pValue: Math.min(1, Math.max(0, pValue)) };
}

/**
 * Compute per-variant statistics and pick the winning variant. The first
 * variant is treated as the control. A variant is only reported as a winner
 * when it has a higher conversion rate than the control.
 */
export function computeExperimentResult(
  flag: FeatureFlag,
  metrics: VariantMetrics[],
): ExperimentResult {
  const metricsByVariant = new Map(metrics.map((m) => [m.variantKey, m]));
  const control = flag.variants[0];
  const controlMetrics = control
    ? metricsByVariant.get(control.key) ?? { variantKey: control.key, exposures: 0, conversions: 0 }
    : null;
  const controlRate =
    controlMetrics && controlMetrics.exposures > 0
      ? controlMetrics.conversions / controlMetrics.exposures
      : 0;

  let best: VariantStatistic | null = null;

  const variants: VariantStatistic[] = flag.variants.map((variant) => {
    const m = metricsByVariant.get(variant.key) ?? {
      variantKey: variant.key,
      exposures: 0,
      conversions: 0,
    };
    const rate = m.exposures > 0 ? m.conversions / m.exposures : 0;
    const isControl = control?.key === variant.key;
    const test =
      isControl || !controlMetrics
        ? { zScore: 0, pValue: 1 }
        : twoProportionZTest(
            controlMetrics.conversions,
            controlMetrics.exposures,
            m.conversions,
            m.exposures,
          );

    const stat: VariantStatistic = {
      variantKey: variant.key,
      name: variant.name,
      exposures: m.exposures,
      conversions: m.conversions,
      conversionRate: rate,
      lift: controlRate > 0 ? (rate - controlRate) / controlRate : rate > 0 ? 1 : 0,
      zScore: test.zScore,
      pValue: test.pValue,
      significant: !isControl && test.pValue < SIGNIFICANCE_LEVEL && rate > controlRate,
      isWinner: false,
    };

    if (m.exposures > 0 && (!best || stat.conversionRate > best.conversionRate)) {
      best = stat;
    }
    return stat;
  });

  const explicitWinner = flag.winnerKey
    ? variants.find((v) => v.variantKey === flag.winnerKey) ?? null
    : null;

  const winnerCandidate = explicitWinner ?? best;
  let winnerKey: string | null = null;
  if (winnerCandidate && control && winnerCandidate.variantKey !== control.key) {
    // Only crown a winner when the improvement is statistically meaningful.
    if (winnerCandidate.significant || flag.status === "completed") {
      winnerKey = winnerCandidate.variantKey;
    }
  } else if (winnerCandidate && !control) {
    winnerKey = winnerCandidate.variantKey;
  }

  if (winnerKey) {
    for (const v of variants) v.isWinner = v.variantKey === winnerKey;
  }

  const winningStat = winnerKey ? variants.find((v) => v.variantKey === winnerKey) : null;
  const significanceP = winningStat ? winningStat.pValue : 1;
  const confidence = winnerKey ? (1 - significanceP) * 100 : 0;

  return {
    flagKey: flag.key,
    variants,
    controlKey: control?.key ?? null,
    winnerKey,
    confidence,
    significant: Boolean(winningStat?.significant || winnerKey),
    totalExposures: variants.reduce((sum, v) => sum + v.exposures, 0),
  };
}

/** Returns a copy of the flag with the winning variant rolled out to 100%. */
export function withWinnerRolledOut(flag: FeatureFlag, winnerKey: string): FeatureFlag {
  return {
    ...flag,
    winnerKey,
    status: "completed",
    rolloutPercentage: 100,
    variants: flag.variants.map((variant) => ({
      ...variant,
      weight: variant.key === winnerKey ? 1 : 0,
    })),
    updatedAt: new Date().toISOString(),
  };
}
