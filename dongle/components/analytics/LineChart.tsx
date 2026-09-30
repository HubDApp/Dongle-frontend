"use client";

import React, { useMemo } from "react";

export interface LineChartDataPoint {
  label: string;
  value: number;
}

export interface LineChartProps {
  data: LineChartDataPoint[];
  title?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showDots?: boolean;
  formatValue?: (value: number) => string;
}

/**
 * Simple, accessible line chart component
 * Uses SVG for rendering without external dependencies
 */
export function LineChart({
  data,
  title,
  color = "#3b82f6",
  height = 200,
  showGrid = true,
  showDots = true,
  formatValue = (v) => v.toString(),
}: LineChartProps) {
  const { points, maxValue, minValue, xStep, yStep } = useMemo(() => {
    if (data.length === 0) {
      return { points: "", maxValue: 0, minValue: 0, xStep: 0, yStep: 0 };
    }

    const values = data.map((d) => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const padding = 40;
    const width = 600;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    const xStep = chartWidth / Math.max(data.length - 1, 1);
    const yScale = chartHeight / range;

    const pointsStr = data
      .map((d, i) => {
        const x = padding + i * xStep;
        const y = padding + chartHeight - (d.value - min) * yScale;
        return `${x},${y}`;
      })
      .join(" ");

    return {
      points: pointsStr,
      maxValue: max,
      minValue: min,
      xStep: chartWidth / (data.length - 1 || 1),
      yStep: chartHeight / 4,
    };
  }, [data, height]);

  if (data.length === 0) {
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

      <svg
        viewBox="0 0 600 240"
        className="w-full"
        role="img"
        aria-label={title || "Line chart"}
      >
        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-20">
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`grid-${i}`}
                x1="40"
                y1={40 + i * yStep}
                x2="560"
                y2={40 + i * yStep}
                stroke="currentColor"
                strokeWidth="1"
                className="text-zinc-400"
              />
            ))}
          </g>
        )}

        {/* Y-axis labels */}
        <g className="text-zinc-500 dark:text-zinc-400">
          {[0, 1, 2, 3, 4].map((i) => {
            const value = maxValue - (i * (maxValue - minValue)) / 4;
            return (
              <text
                key={`y-label-${i}`}
                x="30"
                y={44 + i * yStep}
                fontSize="10"
                textAnchor="end"
                className="fill-current"
              >
                {formatValue(value)}
              </text>
            );
          })}
        </g>

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots &&
          points.split(" ").map((point, i) => {
            const [x, y] = point.split(",").map(Number);
            return (
              <g key={`dot-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill={color}
                  className="hover:r-6 transition-all cursor-pointer"
                >
                  <title>{`${data[i].label}: ${formatValue(data[i].value)}`}</title>
                </circle>
              </g>
            );
          })}

        {/* X-axis labels */}
        <g className="text-zinc-500 dark:text-zinc-400">
          {data.map((d, i) => {
            if (data.length > 10 && i % Math.ceil(data.length / 10) !== 0) {
              return null;
            }
            const x = 40 + i * xStep;
            return (
              <text
                key={`x-label-${i}`}
                x={x}
                y="230"
                fontSize="10"
                textAnchor="middle"
                className="fill-current"
              >
                {d.label}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
