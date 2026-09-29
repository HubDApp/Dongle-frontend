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
