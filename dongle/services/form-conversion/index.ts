/**
 * Form Conversion Tracking Service
 */

export { DEFAULT_CONFIG, DEFAULT_FUNNEL_STEPS, STORAGE_KEY, ATTRIBUTION_KEY, createConfig } from "./config";
export {
  parseUtmParams,
  detectDevice,
  sanitizeReferrer,
  captureAttribution,
  clearAttribution,
} from "./attribution";
export {
  ConversionTracker,
  getConversionTracker,
  trackConversion,
  analyzeConversionFunnel,
  __resetConversionTrackerForTests,
} from "./tracker";
export type {
  ConversionEventName,
  UtmParams,
  DeviceInfo,
  AttributionContext,
  ConversionEvent,
  FunnelStep,
  ConversionFunnel,
  ConversionConfig,
} from "./types";
