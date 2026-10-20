/**
 * Pure helpers to render heatmap overlays (no DOM dependency in core).
 */

import type { HeatPoint } from "./types";

export interface HeatCell {
  x: number;
  y: number;
  intensity: number; // 0–1
  color: string;
}

/** Map weight → CSS color for visualization overlays. */
export function heatColor(intensity: number): string {
  const t = Math.min(1, Math.max(0, intensity));
  // blue → cyan → yellow → red
  if (t < 0.25) {
    const u = t / 0.25;
    return `rgba(59, 130, 246, ${0.15 + u * 0.35})`;
  }
  if (t < 0.5) {
    const u = (t - 0.25) / 0.25;
    return `rgba(34, 211, 238, ${0.35 + u * 0.25})`;
  }
  if (t < 0.75) {
    const u = (t - 0.5) / 0.25;
    return `rgba(250, 204, 21, ${0.45 + u * 0.3})`;
  }
  const u = (t - 0.75) / 0.25;
  return `rgba(239, 68, 68, ${0.55 + u * 0.4})`;
}

export function pointsToCells(points: HeatPoint[]): HeatCell[] {
  if (points.length === 0) return [];
  const max = Math.max(...points.map((p) => p.weight), 1);
  return points.map((p) => {
    const intensity = p.weight / max;
    return {
      x: p.x,
      y: p.y,
      intensity,
      color: heatColor(intensity),
    };
  });
}
