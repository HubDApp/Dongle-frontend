/**
 * Form Recommendation Service Export
 */

export {
  DEFAULT_CONFIG,
  PROFILE_VERSION,
  SENSITIVE_FIELD_PATTERNS,
  SENSITIVE_VALUE_PATTERNS,
  STORAGE_KEY,
  createConfig,
  isSensitiveField,
  isSensitiveValue,
} from "./config";

export {
  clearLearnedData,
  clearProfile,
  fieldKey,
  getFieldProfile,
  hasConsent,
  loadProfile,
  saveProfile,
  setConsent,
  withFieldProfile,
} from "./store";

export {
  feedbackScore,
  forgetValue,
  frequencyScore,
  getRecommendations,
  isSuppressed,
  recencyScore,
  recordFeedback,
  recordFieldValue,
  recordSubmission,
  scoreValue,
} from "./engine";

export type {
  FieldProfile,
  LearnedValue,
  Recommendation,
  RecommendationConfig,
  RecommendationFeedback,
  RecommendationProfile,
} from "./types";
