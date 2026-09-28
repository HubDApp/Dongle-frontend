/**
 * FormUXScoreBadge
 *
 * A compact, accessible display component for a FormUXScore.
 *
 * Usage (minimal):
 *
 *   <FormUXScoreBadge score={score} />
 *
 * Usage (expanded with pain points):
 *
 *   <FormUXScoreBadge score={score} showDetails />
 *
 * The badge is intentionally a development / admin tool — it should only be
 * rendered in contexts where the score information is actionable (e.g. an
 * admin dashboard or a dev-mode overlay).
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { FormUXScore } from "@/lib/form-ux/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ScoreLabel = FormUXScore["label"];

const LABEL_CLASSES: Record<ScoreLabel, string> = {
  excellent:
    "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-900",
  good: "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-900",
  fair: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900",
  poor: "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-900",
};

const SEVERITY_CLASSES = {
  high: "text-red-700 dark:text-red-400",
  medium: "text-amber-700 dark:text-amber-400",
  low: "text-zinc-600 dark:text-zinc-400",
} as const;

const SEVERITY_ICONS = {
  high: "●",
  medium: "◐",
  low: "○",
} as const;

function ScoreRing({
  score,
  label,
}: {
  score: number;
  label: ScoreLabel;
}) {
  // Simple SVG ring with arc proportional to score.
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);

  const strokeColors: Record<ScoreLabel, string> = {
    excellent: "#22c55e",
    good: "#3b82f6",
    fair: "#f59e0b",
    poor: "#ef4444",
  };

  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Track */}
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-zinc-200 dark:text-zinc-700"
      />
      {/* Progress */}
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        stroke={strokeColors[label]}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform="rotate(-90 24 24)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        fill={strokeColors[label]}
      >
        {score}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FormUXScoreBadgeProps {
  /**
   * The computed score object from useFormUXScore / calculateFormUXScore.
   * When null/undefined the badge renders a neutral "No data" state.
   */
  score: FormUXScore | null | undefined;
  /** Render the pain points and improvement suggestions below the score. */
  showDetails?: boolean;
  /** Additional class names for the root element. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FormUXScoreBadge({
  score,
  showDetails = false,
  className,
}: FormUXScoreBadgeProps) {
  if (!score) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
          "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400",
          className,
        )}
        aria-label="Form UX score: no data yet"
      >
        <span className="text-base" aria-hidden="true">
          📋
        </span>
        <span>No UX data yet</span>
      </div>
    );
  }

  const labelCopy: Record<ScoreLabel, string> = {
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  };

  return (
    <div
      className={cn("rounded-xl border p-4", LABEL_CLASSES[score.label], className)}
      role="region"
      aria-label={`Form UX score: ${score.overall} out of 100 — ${labelCopy[score.label]}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <ScoreRing score={score.overall} label={score.label} />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums leading-none">
              {score.overall}
            </span>
            <span className="text-sm font-medium opacity-70">/ 100</span>
          </div>
          <div className="mt-0.5 text-sm font-semibold capitalize">
            {labelCopy[score.label]} UX
          </div>
        </div>
      </div>

      {/* Dimension mini-bars */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {(
          [
            ["Completion Time", score.dimensions.completionTime],
            ["Error Rate", score.dimensions.errorRate],
            ["Correction Effort", score.dimensions.correctionEffort],
            ["Completion", score.dimensions.completion],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div key={label}>
            <div className="mb-0.5 flex justify-between opacity-80">
              <span>{label}</span>
              <span className="font-medium">{value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-current/20">
              <div
                className="h-full rounded-full bg-current opacity-70 transition-all duration-500"
                style={{ width: `${value}%` }}
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                role="progressbar"
                aria-label={`${label}: ${value} out of 100`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Expanded details */}
      {showDetails && score.painPoints.length > 0 && (
        <div className="mt-4 border-t border-current/20 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
            Pain Points
          </p>
          <ul className="space-y-2" role="list" aria-label="Pain points">
            {score.painPoints.map((pp) => (
              <li key={pp.id} className="flex gap-2 text-xs">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 text-base leading-none",
                    SEVERITY_CLASSES[pp.severity],
                  )}
                  aria-label={`${pp.severity} severity`}
                >
                  {SEVERITY_ICONS[pp.severity]}
                </span>
                <span className="opacity-90">{pp.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showDetails && score.improvements.length > 0 && (
        <div className="mt-3 border-t border-current/20 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
            Suggested Improvements
          </p>
          <ul
            className="list-inside list-disc space-y-1 text-xs opacity-90"
            aria-label="Suggested improvements"
          >
            {score.improvements.map((imp) => (
              <li key={imp}>{imp}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamp */}
      <p className="mt-3 text-right text-[10px] opacity-50" aria-hidden="true">
        Calculated{" "}
        {new Date(score.calculatedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
