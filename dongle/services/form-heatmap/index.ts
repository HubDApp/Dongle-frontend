/**
 * Form Heat Mapping Service
 */

export { DEFAULT_CONFIG, STORAGE_KEY, createConfig } from "./config";
export {
  HeatmapCollector,
  loadStoredHeatmaps,
  clearStoredHeatmaps,
} from "./collector";
export { heatColor, pointsToCells } from "./visualize";
export type { HeatCell } from "./visualize";
export { detectDevice, currentDevice, DEVICE_TYPES } from "./types";
export type { DeviceType } from "./types";
export type {
  HeatPoint,
  ClickEvent,
  ScrollDepthSample,
  MouseSample,
  ProblemArea,
  HeatmapSnapshot,
  HeatmapConfig,
} from "./types";
