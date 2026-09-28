export type {
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsProperties,
  AnalyticsTransport,
} from "./types";

export {
  anonymizeWalletAddress,
  bucketQueryLength,
  redactSensitiveText,
  sanitizeProperties,
} from "./privacy";

export {
  track,
  withWalletFingerprint,
  __setAnalyticsTransportForTests,
  __resetAnalyticsForTests,
} from "./client";

export {
  trackPageView,
  trackWalletConnect,
  trackWalletDisconnect,
  trackProjectView,
  trackSearch,
  trackFilter,
  trackProjectSubmit,
  trackVerificationRequest,
  trackReviewSubmit,
  // Issue #521: Form submission analytics
  trackFormSubmissionAttempt,
  trackFormSubmissionSuccess,
  trackFormSubmissionError,
  trackFormAbandonment,
  // Issue #522: Form field interaction analytics
  trackFormFieldFocus,
  trackFormFieldChange,
  trackFormFieldValidation,
  // Issue #523: Form validation performance analytics
  trackFormValidationPerformance,
} from "./events";

// Issue #522 & #523: form analytics aggregation
export {
  getFormAnalyticsAggregates,
  resetFormAnalyticsData,
} from "./form-aggregator";
export type {
  FieldInteractionStats,
  ValidationPerfStats,
  FormSubmissionStats,
  FormAnalyticsAggregates,
} from "./form-aggregator";
