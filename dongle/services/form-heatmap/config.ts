/**
 * Form heat mapping configuration.
 */

import type { HeatmapConfig } from "./types";

export const STORAGE_KEY = "dongle:form-heatmap:v1";

export const DEFAULT_CONFIG: HeatmapConfig = {
  enabled: true,
  sampleMouseMs: 100,
  maxMouseSamples: 400,
  maxClicks: 200,
  rageClickThreshold: 3,
  rageClickWindowMs: 800,
  hesitationMs: 2500,
  persistLocally: true,
};

export function createConfig(overrides: Partial<HeatmapConfig> = {}): HeatmapConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
