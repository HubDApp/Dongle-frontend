/**
 * Form conversion tracking configuration.
 */

import type { ConversionConfig, ConversionEventName } from "./types";

export const STORAGE_KEY = "dongle:form-conversion:v1";
export const ATTRIBUTION_KEY = "dongle:form-attribution:v1";

export const DEFAULT_FUNNEL_STEPS: ConversionEventName[] = [
  "form_view",
  "form_start",
  "form_field_complete",
  "form_submit_attempt",
  "form_submit_success",
];

export const DEFAULT_CONFIG: ConversionConfig = {
  enabled: true,
  persistLocally: true,
  maxEventsStored: 500,
  funnelSteps: DEFAULT_FUNNEL_STEPS,
};

export function createConfig(
  overrides: Partial<ConversionConfig> = {},
): ConversionConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
