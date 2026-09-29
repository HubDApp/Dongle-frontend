"use client";

import type { TimeSeriesPoint } from "@/lib/analytics-dashboard/metrics";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TimeSeriesChart({
  series,
  emptyLabel,
}: {
  series: TimeSeriesPoint[];
  emptyLabel: string;
}) {
  const { t } = useTranslation();
  const width = 640;
  const height = 220;
  const pad = { l: 36, r: 12, t: 16, b: 28 };

  if (series.length === 0) {
    return (
      <div
        role="img"
        aria-label={emptyLabel}
        className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-zinc-500 dark:border-zinc-800"
      >
        {emptyLabel}
      </div>
    );
  }

  const maxProjects = Math.max(1, ...series.map((p) => p.projects));
  const maxReviews = Math.max(1, ...series.map((p) => p.reviews));
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const x = (i: number) => pad.l + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const yProjects = (v: number) => pad.t + innerH - (v / maxProjects) * innerH;
  const yReviews = (v: number) => pad.t + innerH - (v / maxReviews) * innerH;

  const projectPath = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yProjects(p.projects).toFixed(1)}`)
    .join(" ");
  const reviewPath = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${yReviews(p.reviews).toFixed(1)}`)
    .join(" ");

  const summary = t("analytics.timeSeries");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full text-zinc-900 dark:text-zinc-100"
      role="img"
      aria-label={summary}
    >
      <title>{summary}</title>
      <desc>
        {`${t("analytics.totalProjects")}: ${series[series.length - 1]?.projects ?? 0}. ${t("analytics.totalReviews")}: ${series[series.length - 1]?.reviews ?? 0}.`}
      </desc>
      <line
        x1={pad.l}
        y1={pad.t + innerH}
        x2={width - pad.r}
        y2={pad.t + innerH}
        className="stroke-zinc-200 dark:stroke-zinc-800"
      />
      <path d={projectPath} fill="none" className="stroke-blue-600" strokeWidth="2" />
      <path d={reviewPath} fill="none" className="stroke-emerald-500" strokeWidth="2" strokeDasharray="4 3" />
      <text x={pad.l} y={14} className="fill-blue-600 text-[10px]">
        {t("analytics.chartProjects")}
      </text>
      <text x={pad.l + 90} y={14} className="fill-emerald-600 text-[10px]">
        {t("analytics.chartReviews")}
      </text>
    </svg>
  );
}
