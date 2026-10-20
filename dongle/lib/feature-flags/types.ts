/**
 * Feature flag & A/B experiment types (Issue #714).
 *
 * A flag describes a feature that can be toggled for a percentage of users and,
 * optionally, split across weighted variants for experimentation.
 */

export type FlagStatus = "draft" | "running" | "completed";

export interface FlagVariant {
  /** Stable identifier used for bucketing and metric attribution, e.g. "control". */
  key: string;
  /** Human-readable label shown in the admin UI. */
  name: string;
  /** Relative weight used to split traffic between variants. */
  weight: number;
}

export interface FeatureFlag {
  /** Unique, URL-safe key (e.g. "homepage_hero"). */
  key: string;
  name: string;
  description?: string;
  /** Master switch; disabled flags never assign a variant. */
  enabled: boolean;
  variants: FlagVariant[];
  /** Percentage (0–100) of users that are eligible for the experiment. */
  rolloutPercentage: number;
  /** Set once a winner has been chosen and rolled out to 100%. */
  winnerKey?: string;
  status: FlagStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VariantMetrics {
  variantKey: string;
  exposures: number;
  conversions: number;
}

export interface VariantStatistic {
  variantKey: string;
  name: string;
  exposures: number;
  conversions: number;
  conversionRate: number;
  /** Relative improvement over the control variant, as a fraction. */
  lift: number;
  /** Z-score from the two-proportion test against the control. */
  zScore: number;
  /** Two-tailed p-value. */
  pValue: number;
  significant: boolean;
  isWinner: boolean;
}

export interface ExperimentResult {
  flagKey: string;
  variants: VariantStatistic[];
  controlKey: string | null;
  winnerKey: string | null;
  /** Confidence that the winner beats the control, as a percentage. */
  confidence: number;
  significant: boolean;
  totalExposures: number;
}
