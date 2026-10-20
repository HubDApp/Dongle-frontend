import React from "react";
import type { HealthSnapshot } from "@/lib/project-health";

interface HealthHistoryChartProps {
  history: HealthSnapshot[];
  className?: string;
}

const WIDTH = 320;
const HEIGHT = 140;
const PAD = { top: 10, right: 10, bottom: 22, left: 28 };
const GRID = [0, 40, 60, 80, 100];

function formatWeek(week: string): string {
  return new Date(`${week}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Weekly health score line chart. Grid lines mark the grade thresholds
 * (40 fair, 60 good, 80 excellent). A data table is rendered for screen readers.
 */
export function HealthHistoryChart({ history, className = "" }: HealthHistoryChartProps) {
  if (history.length < 2) {
    return (
      <p className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>
        History builds up as weekly snapshots are recorded. Check back next week to see a trend.
      </p>
    );
  }

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (history.length - 1)) * innerW;
  const y = (score: number) => PAD.top + (1 - score / 100) * innerH;

  const points = history.map((s, i) => `${x(i).toFixed(1)},${y(s.score).toFixed(1)}`).join(" ");
  const first = history[0];
  const last = history[history.length - 1];

  return (
    <figure className={className}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto text-blue-500"
        role="img"
        aria-label={`Health score history: ${first.score} on ${formatWeek(first.week)} to ${last.score} on ${formatWeek(last.week)}`}
      >
        {GRID.map((g) => (
          <g key={g}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(g)}
              y2={y(g)}
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(g)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-zinc-400 dark:fill-zinc-500 text-[9px]"
            >
              {g}
            </text>
          </g>
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {history.map((s, i) => (
          <circle key={s.week} cx={x(i)} cy={y(s.score)} r={2.5} fill="currentColor">
            <title>{`${formatWeek(s.week)}: ${s.score}`}</title>
          </circle>
        ))}
        <text x={PAD.left} y={HEIGHT - 6} className="fill-zinc-400 dark:fill-zinc-500 text-[9px]">
          {formatWeek(first.week)}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 6}
          textAnchor="end"
          className="fill-zinc-400 dark:fill-zinc-500 text-[9px]"
        >
          {formatWeek(last.week)}
        </text>
      </svg>
      <table className="sr-only">
        <caption>Weekly health score</caption>
        <thead>
          <tr>
            <th scope="col">Week of</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {history.map((s) => (
            <tr key={s.week}>
              <td>{formatWeek(s.week)}</td>
              <td>{s.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default HealthHistoryChart;
