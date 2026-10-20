"use client";

import React, { useEffect, useState } from "react";
import { HealthBadge, HEALTH_GRADE_STYLES } from "@/components/projects/HealthBadge";
import { HealthHistoryChart } from "@/components/projects/HealthHistoryChart";
import {
  HEALTH_GRADE_LABELS,
  getHealthHistory,
  getHealthTrend,
  recordHealthSnapshot,
  type HealthSnapshot,
  type ProjectHealth,
} from "@/lib/project-health";

interface ProjectHealthPanelProps {
  projectId: string;
  health: ProjectHealth;
}

/**
 * Sidebar card on the project detail page: score, per-factor breakdown and the
 * weekly history chart. Viewing the page records this week's snapshot.
 */
export function ProjectHealthPanel({ projectId, health }: ProjectHealthPanelProps) {
  const [history, setHistory] = useState<HealthSnapshot[]>([]);

  useEffect(() => {
    recordHealthSnapshot(projectId, health.score);
    setHistory(getHealthHistory(projectId));
  }, [projectId, health.score]);

  const trend = getHealthTrend(history);

  return (
    <section
      aria-labelledby="project-health-heading"
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 id="project-health-heading" className="text-lg font-bold">
          Project Health
        </h3>
        <HealthBadge health={health} trend={trend} />
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl font-bold tabular-nums">{health.score}</span>
        <span className="text-zinc-500 dark:text-zinc-400">/ 100</span>
        <span
          className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold border ${HEALTH_GRADE_STYLES[health.grade]}`}
        >
          {HEALTH_GRADE_LABELS[health.grade]}
        </span>
      </div>

      <ul className="space-y-3 mb-6">
        {health.factors.map((f) => (
          <li key={f.key}>
            <div className="flex justify-between text-sm">
              <span className={f.available ? "" : "text-zinc-400 dark:text-zinc-500"}>{f.label}</span>
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                {f.available ? `${f.score} · ${Math.round(f.effectiveWeight * 100)}%` : "not counted"}
              </span>
            </div>
            <div
              className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${f.available ? f.score : 0}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{f.detail}</p>
          </li>
        ))}
      </ul>

      {health.redistributed && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
          Factors that can&apos;t be measured for this project are excluded, and their weight is
          shared proportionally across the rest.
        </p>
      )}

      <h4 className="text-sm font-semibold mb-2">Weekly history</h4>
      <HealthHistoryChart history={history} />
    </section>
  );
}

export default ProjectHealthPanel;
