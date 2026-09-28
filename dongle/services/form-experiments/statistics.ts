/**
 * Statistical Significance & Hypothesis Testing for Form A/B Experiments
 */

/**
 * Standard Normal Cumulative Distribution Function approximation
 * (Abramowitz & Stegun formula 7.1.26 with max error < 1.5e-7)
 */
export function normalCDF(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;

  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228; // 1 / sqrt(2*pi)

  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const phi = 1.0 - c * Math.exp(-0.5 * absZ * absZ) * poly;

  return z >= 0 ? phi : 1.0 - phi;
}

/**
 * Calculate 95% confidence interval for a proportion using Wilson score interval
 */
export function calculateConfidenceInterval95(
  conversions: number,
  trials: number,
): [number, number] {
  if (trials <= 0) return [0, 0];

  const z = 1.95996; // 95% z-score
  const p = conversions / trials;
  const z2 = z * z;

  const denominator = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p) + z2 / (4 * trials)) / trials)) / denominator;

  const lower = Math.max(0, Math.round((center - margin) * 1000) / 1000);
  const upper = Math.min(1, Math.round((center + margin) * 1000) / 1000);

  return [lower, upper];
}

/**
 * Perform a two-proportion Z-test comparing a variant against the control
 */
export function calculateZTest(
  variantConversions: number,
  variantTrials: number,
  controlConversions: number,
  controlTrials: number,
): {
  zScore: number;
  pValue: number;
  liftVsControlPercent: number;
  isStatisticallySignificant: boolean;
  confidenceLevel: number;
} {
  // If insufficient sample size
  if (variantTrials < 10 || controlTrials < 10) {
    const p1 = variantTrials > 0 ? variantConversions / variantTrials : 0;
    const p0 = controlTrials > 0 ? controlConversions / controlTrials : 0;
    const lift = p0 > 0 ? ((p1 - p0) / p0) * 100 : 0;
    return {
      zScore: 0,
      pValue: 1,
      liftVsControlPercent: Math.round(lift * 10) / 10,
      isStatisticallySignificant: false,
      confidenceLevel: 0,
    };
  }

  const p1 = variantConversions / variantTrials;
  const p0 = controlConversions / controlTrials;

  // Pooled proportion
  const pooledP =
    (variantConversions + controlConversions) /
    (variantTrials + controlTrials);

  if (pooledP === 0 || pooledP === 1) {
    return {
      zScore: 0,
      pValue: 1,
      liftVsControlPercent: 0,
      isStatisticallySignificant: false,
      confidenceLevel: 0,
    };
  }

  // Standard Error
  const se = Math.sqrt(
    pooledP * (1 - pooledP) * (1 / variantTrials + 1 / controlTrials),
  );

  if (se === 0) {
    return {
      zScore: 0,
      pValue: 1,
      liftVsControlPercent: 0,
      isStatisticallySignificant: false,
      confidenceLevel: 0,
    };
  }

  const zScore = (p1 - p0) / se;
  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  const liftVsControlPercent = p0 > 0 ? ((p1 - p0) / p0) * 100 : 0;
  const isStatisticallySignificant = pValue < 0.05;
  const confidenceLevel = Math.max(0, Math.min(100, Math.round((1 - pValue) * 100)));

  return {
    zScore: Math.round(zScore * 100) / 100,
    pValue: Math.round(pValue * 10000) / 10000,
    liftVsControlPercent: Math.round(liftVsControlPercent * 10) / 10,
    isStatisticallySignificant,
    confidenceLevel,
  };
}
