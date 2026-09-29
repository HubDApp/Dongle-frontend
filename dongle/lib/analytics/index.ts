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
  trackFormSubmit,
  trackFormSubmitSuccess,
  trackFormSubmitError,
  trackFormFieldChange,
  trackFormAbandon,
  trackFormBackupCreated,
  trackFormBackupRestored,
  trackFormBackupFailed,
  trackFormBackupRetentionCleaned,
  trackFormArchiveCreated,
  trackFormArchiveRestored,
  trackFormArchiveSearch,
  trackFormArchiveDeleted,
  trackFormArchiveRetentionCleaned,
  trackConsentGiven,
  trackConsentWithdrawn,
  trackDataExport,
  trackDataDeletionRequested,
  trackDataDeletionCompleted,
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
