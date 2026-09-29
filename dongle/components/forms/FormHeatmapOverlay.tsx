"use client";

import React from "react";
import type { HeatCell, ProblemArea } from "@/services/form-heatmap";

export interface FormHeatmapOverlayProps {
  cells: HeatCell[];
  problemAreas?: ProblemArea[];
  visible?: boolean;
  className?: string;
}

/**
 * Absolute overlay that paints click-density heat cells over a form.
 * Parent must be `position: relative`.
 */
export function FormHeatmapOverlay({
  cells,
  problemAreas = [],
  visible = true,
  className = "",
}: FormHeatmapOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 overflow-hidden ${className}`}
      aria-hidden="true"
      data-testid="form-heatmap-overlay"
    >
      {cells.map((cell, i) => (
        <span
          key={`${cell.x}-${cell.y}-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${cell.x * 100}%`,
            top: `${cell.y * 100}%`,
            width: 28,
            height: 28,
            transform: "translate(-50%, -50%)",
            background: cell.color,
            opacity: 0.85,
          }}
        />
      ))}

      {problemAreas.length > 0 && (
        <ul className="pointer-events-auto absolute bottom-2 right-2 max-w-xs rounded bg-black/75 p-2 text-xs text-white">
          {problemAreas.slice(0, 5).map((area, i) => (
            <li key={`${area.fieldId}-${area.issue}-${i}`}>
              <strong>{area.issue}</strong> on {area.fieldId}: {area.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
