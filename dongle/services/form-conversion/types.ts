/**
 * Form conversion tracking types — attribution, device, and funnel analysis.
 */

export type ConversionEventName =
  | "form_view"
  | "form_start"
  | "form_field_complete"
  | "form_submit_attempt"
  | "form_submit_success"
  | "form_submit_failure"
  | "form_abandon";

export interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

export interface DeviceInfo {
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  browser: string;
  os: string;
  viewportWidth: number;
  viewportHeight: number;
  touchCapable: boolean;
}

export interface AttributionContext {
  utm: UtmParams;
  referrer: string | null;
  landingPath: string | null;
  device: DeviceInfo;
  sessionId: string;
  capturedAt: number;
}

export interface ConversionEvent {
  id: string;
  name: ConversionEventName;
  formId: string;
  formType: string;
  timestamp: number;
  attribution: AttributionContext;
  properties?: Record<string, string | number | boolean | null>;
}

export interface FunnelStep {
  name: ConversionEventName;
  count: number;
  uniqueSessions: number;
  dropOffRate: number;
}

export interface ConversionFunnel {
  formId: string;
  formType: string;
  steps: FunnelStep[];
  conversionRate: number;
  totalViews: number;
  totalConversions: number;
  bySource: Record<string, { views: number; conversions: number; rate: number }>;
  byDevice: Record<string, { views: number; conversions: number; rate: number }>;
  byReferrer: Record<string, { views: number; conversions: number; rate: number }>;
}

export interface ConversionConfig {
  enabled: boolean;
  persistLocally: boolean;
  maxEventsStored: number;
  funnelSteps: ConversionEventName[];
}
