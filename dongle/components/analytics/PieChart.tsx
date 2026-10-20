"use client";

import React, { useMemo } from "react";

export interface PieChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  data: PieChartDataPoint[];
  title?: string;
  size?: number;
  showLegend?: boolean;
  showPercentages?: boolean;
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

/**
 * Simple, accessible pie chart component
 * Uses SVG for rendering without external dependencies
 */
export function PieChart({
  data,
  title,
  size = 200,
  showLegend = true,
  showPercentages = true,
}: PieChartProps) {
  const { segments, total } = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    
    if (total === 0) {
      return { segments: [], total: 0 };
    }

    let currentAngle = -90; // Start at top

    const segments = data.map((item, i) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Calculate path for pie slice
      const radius = size / 2 - 10;
      const centerX = size / 2;
      const centerY = size / 2;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");

      currentAngle = endAngle;

      return {
        path,
        color: item.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        label: item.label,
        value: item.value,
        percentage,
      };
    });

    return { segments, total };
  }, [data, size]);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-400">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
          {title}
        </h3>
      )}

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Pie Chart */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={title || "Pie chart"}
          className="flex-shrink-0"
        >
          {segments.map((segment, i) => (
            <g key={`segment-${i}`}>
              <path
                d={segment.path}
                fill={segment.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
                strokeWidth="2"
                stroke="white"
              >
                <title>
                  {segment.label}: {segment.value} ({segment.percentage.toFixed(1)}%)
                </title>
              </path>
            </g>
          ))}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-col gap-2 flex-1">
            {segments.map((segment, i) => (
              <div key={`legend-${i}`} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      {segment.label}
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex-shrink-0">
                      {segment.value}
                    </span>
                  </div>
                  {showPercentages && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {segment.percentage.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
