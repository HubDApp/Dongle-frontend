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
} from "./events";
