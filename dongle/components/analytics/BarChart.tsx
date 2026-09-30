"use client";

import React from "react";

export interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  title?: string;
  height?: number;
  formatValue?: (value: number) => string;
  horizontal?: boolean;
}

/**
 * Simple, accessible bar chart component
 * Uses SVG for rendering without external dependencies
 */
export function BarChart({
  data,
  title,
  height = 300,
  formatValue = (v) => v.toString(),
  horizontal = false,
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-400">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = horizontal ? 400 : 40;
  const spacing = horizontal ? 60 : 80;

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
          {title}
        </h3>
      )}

      <svg
        viewBox={`0 0 ${horizontal ? 600 : data.length * spacing + 100} ${height}`}
        className="w-full"
        role="img"
        aria-label={title || "Bar chart"}
      >
        {horizontal ? (
          // Horizontal bars
          <g>
            {data.map((item, i) => {
              const barHeight = 30;
              const y = 50 + i * spacing;
              const barLength = (item.value / maxValue) * barWidth;

              return (
                <g key={`bar-${i}`}>
                  {/* Label */}
                  <text
                    x="10"
                    y={y + barHeight / 2 + 5}
                    fontSize="12"
                    className="fill-zinc-600 dark:fill-zinc-400"
                  >
                    {item.label}
                  </text>

                  {/* Bar */}
                  <rect
                    x="150"
                    y={y}
                    width={barLength}
                    height={barHeight}
                    fill={item.color || "#3b82f6"}
                    rx="4"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <title>{`${item.label}: ${formatValue(item.value)}`}</title>
                  </rect>

                  {/* Value */}
                  <text
                    x={160 + barLength}
                    y={y + barHeight / 2 + 5}
                    fontSize="12"
                    className="fill-zinc-700 dark:fill-zinc-300 font-semibold"
                  >
                    {formatValue(item.value)}
                  </text>
                </g>
              );
            })}
          </g>
        ) : (
          // Vertical bars
          <g>
            {data.map((item, i) => {
              const x = 50 + i * spacing;
              const barHeight = (item.value / maxValue) * (height - 100);
              const y = height - 50 - barHeight;

              return (
                <g key={`bar-${i}`}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={item.color || "#3b82f6"}
                    rx="4"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <title>{`${item.label}: ${formatValue(item.value)}`}</title>
                  </rect>

                  {/* Value on top */}
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    fontSize="12"
                    textAnchor="middle"
                    className="fill-zinc-700 dark:fill-zinc-300 font-semibold"
                  >
                    {formatValue(item.value)}
                  </text>

                  {/* Label */}
                  <text
                    x={x + barWidth / 2}
                    y={height - 30}
                    fontSize="11"
                    textAnchor="middle"
                    className="fill-zinc-600 dark:fill-zinc-400"
                  >
                    {item.label.length > 10
                      ? item.label.substring(0, 10) + "..."
                      : item.label}
                  </text>
                </g>
              );
            })}

            {/* X-axis */}
            <line
              x1="40"
              y1={height - 50}
              x2={data.length * spacing + 50}
              y2={height - 50}
              stroke="currentColor"
              strokeWidth="2"
              className="text-zinc-300 dark:text-zinc-700"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
