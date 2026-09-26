"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { downloadCsv, toCsv } from "@/lib/analytics-dashboard/csv";
import type { AnalyticsRange } from "@/lib/analytics-dashboard/metrics";
import { Button } from "@/components/ui/Button";

interface FormSubmissionMetrics {
  period: string;
  submissionCount: number;
  errorCount: number;
  errorRate: number;
  abandonmentCount: number;
  abandonmentRate: number;
  avgFieldCompletion: number;
}

interface FormFieldCompletion {
  fieldName: string;
  completed: number;
  total: number;
  rate: number;
}

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "all"];

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Generates synthetic form submission metrics for the dashboard.
 * In production, this data would come from the analytics event store
 * or a backend aggregation service.
 */
function generateFormSubmissionMetrics(
  range: AnalyticsRange,
): FormSubmissionMetrics[] {
  const now = new Date();
  const periods: string[] = [];
  const counts: number[] = [];
  const errors: number[] = [];
  const abandons: number[] = [];
  const completions: number[] = [];

  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    periods.push(date.toISOString().slice(0, 10));

    const baseCount = Math.floor(Math.random() * 20) + 5;
    counts.push(baseCount);
    errors.push(Math.floor(baseCount * (0.02 + Math.random() * 0.08)));
    abandons.push(Math.floor(baseCount * (0.05 + Math.random() * 0.15)));
    completions.push(Math.floor(70 + Math.random() * 25));
  }

  return periods.map((period, i) => ({
    period,
    submissionCount: counts[i],
    errorCount: errors[i],
    errorRate: counts[i] > 0 ? errors[i] / counts[i] : 0,
    abandonmentCount: abandons[i],
    abandonmentRate: counts[i] > 0 ? abandons[i] / counts[i] : 0,
    avgFieldCompletion: completions[i] / 100,
  }));
}

function generateFieldCompletionRates(): FormFieldCompletion[] {
  return [
    { fieldName: "Project Name", completed: 920, total: 1000, rate: 0.92 },
    { fieldName: "Category", completed: 880, total: 1000, rate: 0.88 },
    { fieldName: "Description", completed: 750, total: 1000, rate: 0.75 },
    { fieldName: "Website URL", completed: 620, total: 1000, rate: 0.62 },
    { fieldName: "GitHub URL", completed: 540, total: 1000, rate: 0.54 },
    { fieldName: "Logo URL", completed: 310, total: 1000, rate: 0.31 },
    { fieldName: "Docs URL", completed: 280, total: 1000, rate: 0.28 },
    { fieldName: "Audit Report URL", completed: 190, total: 1000, rate: 0.19 },
    { fieldName: "Bug Bounty URL", completed: 120, total: 1000, rate: 0.12 },
    { fieldName: "Contract Addresses", completed: 95, total: 1000, rate: 0.095 },
  ];
}

function BarChart({
  data,
  label,
  color,
}: {
  data: { label: string; value: number }[];
  label: string;
  color: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2" role="img" aria-label={label}>
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 truncate text-zinc-600 dark:text-zinc-400">
            {item.label}
          </span>
          <div className="flex-1 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="w-12 text-right text-zinc-500 dark:text-zinc-400">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SimpleLineChart({
  data,
  xKey,
  yKey,
  color,
  label,
}: {
  data: { [key: string]: number | string }[];
  xKey: string;
  yKey: string;
  color: string;
  label: string;
}) {
  const width = 640;
  const height = 200;
  const pad = { l: 40, r: 12, t: 16, b: 28 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const values = data.map((d) => Number(d[yKey])).filter((v) => !Number.isNaN(v));
  const max = Math.max(1, ...values);

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? pad.l + innerW / 2
        : pad.l + (i / (data.length - 1)) * innerW;
    const y = pad.t + innerH - (Number(d[yKey]) / max) * innerH;
    return { x, y, value: d[yKey], label: d[xKey] };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="relative" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={width - pad.r}
          y2={pad.t + innerH}
          className="stroke-zinc-200 dark:stroke-zinc-800"
        />
        <path d={pathD} fill="none" style={{ stroke: color }} strokeWidth="2" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r="3"
            style={{ fill: color }}
          />
        ))}
        <text x={pad.l} y={14} className="fill-zinc-500 text-[10px]">
          {label}
        </text>
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
        <span>{data[0]?.[xKey]}</span>
        <span>{data[data.length - 1]?.[xKey]}</span>
      </div>
    </div>
  );
}

export default function FormSubmissionAnalytics() {
  const { t } = useTranslation();
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [metrics, setMetrics] = useState<FormSubmissionMetrics[]>([]);
  const [fieldCompletion, setFieldCompletion] = useState<FormFieldCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(() => {
    setLoading(true);
    // Simulate async data loading
    setTimeout(() => {
      setMetrics(generateFormSubmissionMetrics(range));
      setFieldCompletion(generateFieldCompletionRates());
      setLoading(false);
    }, 300);
  }, [range]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const totalSubmissions = metrics.reduce((sum, m) => sum + m.submissionCount, 0);
  const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
  const totalAbandons = metrics.reduce((sum, m) => sum + m.abandonmentCount, 0);
  const overallErrorRate =
    totalSubmissions > 0 ? totalErrors / totalSubmissions : 0;
  const overallAbandonmentRate =
    totalSubmissions > 0 ? totalAbandons / totalSubmissions : 0;
  const avgCompletion =
    fieldCompletion.length > 0
      ? fieldCompletion.reduce((sum, f) => sum + f.rate, 0) / fieldCompletion.length
      : 0;

  const exportCsv = () => {
    const headers = [
      "period",
      "submission_count",
      "error_count",
      "error_rate",
      "abandonment_count",
      "abandonment_rate",
      "avg_field_completion",
    ];
    const rows = metrics.map((m) => [
      m.period,
      m.submissionCount,
      m.errorCount,
      m.errorRate,
      m.abandonmentCount,
      m.abandonmentRate,
      m.avgFieldCompletion,
    ]);
    const csv = toCsv(headers, rows);
    downloadCsv("form_submission_analytics.csv", csv);
  };

  return (
    <section className="space-y-6" aria-label="Form submission analytics">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold">
          {t("analytics.formSubmissions.title")}
        </h2>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                range === r
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
          <Button onClick={exportCsv} disabled={loading} className="ml-2">
            {t("analytics.exportCsv")}
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-zinc-500 dark:border-zinc-800">
          {t("common.loading")}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-4">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("analytics.formSubmissions.totalSubmissions")}
              </p>
              <p className="text-2xl font-bold">{totalSubmissions}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("analytics.formSubmissions.errorRate")}
              </p>
              <p className="text-2xl font-bold">{formatRate(overallErrorRate)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("analytics.formSubmissions.abandonmentRate")}
              </p>
              <p className="text-2xl font-bold">
                {formatRate(overallAbandonmentRate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("analytics.formSubmissions.fieldCompletion")}
              </p>
              <p className="text-2xl font-bold">
                {formatRate(avgCompletion)}
              </p>
            </div>
          </div>

          {/* Submission count by period chart */}
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-semibold">
              {t("analytics.formSubmissions.submissionCountByPeriod")}
            </h3>
            <SimpleLineChart
              data={metrics.map((m) => ({
                period: m.period,
                count: m.submissionCount,
              }))}
              xKey="period"
              yKey="count"
              color="#3b82f6"
              label={t("analytics.formSubmissions.submissions")}
            />
          </div>

          {/* Error rate tracking chart */}
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-semibold">
              {t("analytics.formSubmissions.errorRate")}
            </h3>
            <SimpleLineChart
              data={metrics.map((m) => ({
                period: m.period,
                rate: m.errorRate,
              }))}
              xKey="period"
              yKey="rate"
              color="#ef4444"
              label={t("analytics.formSubmissions.errorRate")}
            />
          </div>

          {/* Abandonment rate chart */}
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-semibold">
              {t("analytics.formSubmissions.abandonmentRate")}
            </h3>
            <SimpleLineChart
              data={metrics.map((m) => ({
                period: m.period,
                rate: m.abandonmentRate,
              }))}
              xKey="period"
              yKey="rate"
              color="#f59e0b"
              label={t("analytics.formSubmissions.abandonmentRate")}
            />
          </div>

          {/* Field completion rates */}
          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-semibold">
              {t("analytics.formSubmissions.fieldCompletionRates")}
            </h3>
            <BarChart
              data={fieldCompletion.map((f) => ({
                label: f.fieldName,
                value: Math.round(f.rate * 100),
              }))}
              label={t("analytics.formSubmissions.fieldCompletionRates")}
              color="#10b981"
            />
          </div>
        </>
      )}
    </section>
  );
}
