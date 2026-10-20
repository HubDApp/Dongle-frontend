/**
 * Feature flags & A/B testing (Issue #714).
 */

export {
  SIGNIFICANCE_LEVEL,
  hashString,
  bucketFor,
  pickVariant,
  normalCdf,
  twoProportionZTest,
  computeExperimentResult,
  withWinnerRolledOut,
} from "./engine";

export {
  listFlags,
  getFlag,
  upsertFlag,
  deleteFlag,
  createFlag,
  isFeatureEnabled,
  getVariant,
  getMetrics,
  recordExposure,
  recordConversion,
  resetMetrics,
  getExperimentResult,
  selectWinner,
} from "./service";

export type {
  FlagStatus,
  FlagVariant,
  FeatureFlag,
  VariantMetrics,
  VariantStatistic,
  ExperimentResult,
} from "./types";
