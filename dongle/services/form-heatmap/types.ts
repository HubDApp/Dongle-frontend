/**
 * Form heat mapping types — clicks, scroll, mouse, problem areas.
 */

/**
 * Device classification for heatmap segmentation (Issue #713).
 */
export type DeviceType = "desktop" | "tablet" | "mobile";

export const DEVICE_TYPES: DeviceType[] = ["desktop", "tablet", "mobile"];

/** Classify a viewport width into a device bucket. */
export function detectDevice(width: number): DeviceType {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** Classify the current viewport (server-safe: falls back to "desktop"). */
export function currentDevice(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  return detectDevice(window.innerWidth);
}

export interface HeatPoint {
  x: number; // 0–1 relative to form bounding box
  y: number;
  weight: number;
  timestamp: number;
  fieldId?: string;
}

export interface ClickEvent {
  x: number;
  y: number;
  timestamp: number;
  targetTag: string;
  fieldId?: string;
  button: number;
}

export interface ScrollDepthSample {
  depth: number; // 0–1 of form height scrolled into view
  timestamp: number;
}

export interface MouseSample {
  x: number;
  y: number;
  timestamp: number;
}

export interface ProblemArea {
  fieldId: string;
  issue:
    | "rage_click"
    | "dead_click"
    | "high_hesitation"
    | "scroll_abandon"
    | "low_engagement";
  severity: "low" | "medium" | "high";
  score: number;
  detail: string;
}

export interface HeatmapSnapshot {
  formId: string;
  formType: string;
  sessionId: string;
  /** Device bucket the snapshot was captured on (Issue #713). */
  device?: DeviceType;
  clicks: ClickEvent[];
  scrollDepth: ScrollDepthSample[];
  maxScrollDepth: number;
  mousePath: MouseSample[];
  heatPoints: HeatPoint[];
  problemAreas: ProblemArea[];
  startedAt: number;
  endedAt: number;
  formWidth: number;
  formHeight: number;
}

export interface HeatmapConfig {
  enabled: boolean;
  sampleMouseMs: number;
  maxMouseSamples: number;
  maxClicks: number;
  rageClickThreshold: number;
  rageClickWindowMs: number;
  hesitationMs: number;
  persistLocally: boolean;
}
