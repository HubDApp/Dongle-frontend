import React, { useId } from "react";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HEALTH_GRADE_LABELS,
  type HealthGrade,
  type ProjectHealth,
} from "@/lib/project-health";

export const HEALTH_GRADE_STYLES: Record<HealthGrade, string> = {
  excellent:
    "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-900",
  good: "bg-lime-100 dark:bg-lime-950/40 text-lime-800 dark:text-lime-200 border-lime-200 dark:border-lime-900",
  fair: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900",
  poor: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-900",
};

interface HealthBadgeProps {
  health: ProjectHealth;
  /** Week-over-week change in score; hidden when null/0. */
  trend?: number | null;
  className?: string;
}

function formatPercent(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

export function HealthBadge({ health, trend, className }: HealthBadgeProps) {
  const tooltipId = useId();
  const delta = typeof trend === "number" ? trend : 0;

  return (
    <span className={cn("group/health relative inline-flex", className)}>
      <span
        aria-describedby={tooltipId}
        data-grade={health.grade}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase",
          HEALTH_GRADE_STYLES[health.grade],
        )}
      >
        <Activity className="w-3 h-3" aria-hidden="true" />
        <span>Health {health.score}</span>
        {delta !== 0 && (
          <span
            className="inline-flex items-center"
            aria-label={`${delta > 0 ? "up" : "down"} ${Math.abs(delta)} this week`}
          >
            {delta > 0 ? (
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3 h-3" aria-hidden="true" />
            )}
            {Math.abs(delta)}
          </span>
        )}
      </span>

      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none invisible opacity-0 group-hover/health:visible group-hover/health:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-opacity absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-left text-xs font-normal normal-case tracking-normal text-zinc-700 dark:text-zinc-300 shadow-lg"
      >
        <span className="block font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Health {health.score}/100 · {HEALTH_GRADE_LABELS[health.grade]}
        </span>
        <span className="block space-y-1">
          {health.factors.map((f) => (
            <span key={f.key} className="flex justify-between gap-2">
              <span className={f.available ? "" : "text-zinc-400 dark:text-zinc-500"}>
                {f.label}
                <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">{f.detail}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {f.available ? `${f.score} × ${formatPercent(f.effectiveWeight)}` : "n/a"}
              </span>
            </span>
          ))}
        </span>
        {health.redistributed && (
          <span className="block mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
            Unavailable factors are excluded and their weight shared across the rest.
          </span>
        )}
      </span>
    </span>
  );
}

export default HealthBadge;
