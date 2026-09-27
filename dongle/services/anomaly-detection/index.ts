/**
 * Anomaly Detection Service Export
 */

export { AnomalyDetector } from "./detector";
export { AnomalyManager } from "./manager";
export {
  DEFAULT_CONFIG,
  STRICT_CONFIG,
  LENIENT_CONFIG,
  DEV_CONFIG,
  getConfig,
  createCustomConfig,
} from "./config";
export {
  FormAnomalyIntegration,
  checkFormAnomaly,
  calculateServerDeviceFingerprint,
  sanitizeMetricsForLogging,
} from "./form-integration";
export type {
  FormSubmissionMetrics,
  AnomalyScore,
  StatisticalModel,
  AnomalyDetectionStats,
  FlaggedSubmission,
  AnomalyDetectionConfig,
  LearningFeedback,
  AnomalyDetectionResult,
} from "./types";
