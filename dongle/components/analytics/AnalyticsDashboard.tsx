"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import TimeSeriesChart from "./TimeSeriesChart";
import { downloadCsv, toCsv } from "@/lib/analytics-dashboard/csv";
import type { AnalyticsRange, AnalyticsResult, VerificationFilter } from "@/lib/analytics-dashboard/metrics";
import { ALL_CATEGORIES } from "@/types/project";
import { Button } from "@/components/ui/Button";
import { getJson } from "@/lib/data-layer";

interface Payload {
  result: AnalyticsResult;
  generatedAt: string;
  source: string;
  rpcError?: string;
  stale: boolean;
}

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "all"];
const STATUSES: VerificationFilter[] = ["all", "VERIFIED", "PENDING", "REJECTED", "NONE"];

function formatRate(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export default function AnalyticsDashboard() {
  const { t, format } = useTranslation();
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<VerificationFilter>("all");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getJson<Payload>({
        method: "GET",
        url: "/api/analytics",
        params: { range, category, status },
        tags: ["analytics"],
        persist: true,
      });
      if (!result.ok || !result.data) throw new Error("fail");
      setData(result.data);
    } catch {
      setError(t("analytics.loadFailed"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [category, range, status, t]);

  useEffect(() => {
    void query();
  }, [query]);

  const exportCsv = () => {
    if (!data) {
      return;
    }
    try {
      const headers = [
        "project_id",
        "name",
        "category",
        "reviews_per_week",
        "rating",
        "review_count",
        "created_at",
      ];
      const rows = data.result.trending.map((row) => [
        row.id,
        row.name,
        row.category,
        row.reviewsPerWeek.toFixed(4),
        row.rating,
        row.reviewCount,
        row.createdAt,
      ]);
      downloadCsv(
        `dongle-analytics-${range}.csv`,
        toCsv(headers, rows),
      );
    } catch (err) {
      console.error("[analytics] csv failed", err);
      setError(t("analytics.exportFailed"));
    }
  };

  const summary = data?.result.summary;

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            {t("analytics.subtitle")}
          </p>
          {data ? (
            <p className="mt-1 text-xs text-zinc-500">
              {t("analytics.lastUpdated", {
                date: format.formatDate(data.generatedAt, { includeTime: true }),
              })}
            </p>
          ) : null}
          {data?.stale || data?.rpcError ? (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {data.rpcError ? t("analytics.rpcFailed") : t("analytics.stale")}
            </p>
          ) : null}
        </div>
        <Button onClick={exportCsv} disabled={!data} className="shrink-0">
          {t("analytics.exportCsv")}
        </Button>
      </header>

      <fieldset className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold">{t("analytics.filters")}</legend>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span>{t("analytics.range")}</span>
          <select
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={range}
            onChange={(e) => setRange(e.target.value as AnalyticsRange)}
          >
            {RANGES.map((value) => (
              <option key={value} value={value}>
                {t(`analytics.range${value === "all" ? "All" : value}` as never)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span>{t("analytics.category")}</span>
          <select
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">{t("analytics.allCategories")}</option>
            {ALL_CATEGORIES.filter((c) => c !== "All").map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span>{t("analytics.verificationStatus")}</span>
          <select
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={status}
            onChange={(e) => setStatus(e.target.value as VerificationFilter)}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value === "all" ? t("analytics.allStatuses") : value}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {loading ? <p className="text-sm text-zinc-500">{t("analytics.loading")}</p> : null}
      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/40">
          <p>{error}</p>
          <Button className="mt-2" size="sm" onClick={() => void query()}>
            {t("analytics.retry")}
          </Button>
        </div>
      ) : null}

      {data && !loading ? (
        <>
          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={t("analytics.averageRating")} value={summary?.averageRating?.toFixed(2) ?? "—"} />
            <MetricCard
              label={t("analytics.medianReviews")}
              value={summary?.medianReviewCount != null ? String(summary.medianReviewCount) : "—"}
            />
            <MetricCard
              label={t("analytics.approvalRate")}
              value={formatRate(summary?.verificationApprovalRate ?? null)}
            />
            <MetricCard
              label={t("analytics.newProjectsWeek")}
              value={summary ? summary.newProjectsPerWeek.toFixed(1) : "—"}
            />
          </section>

          <section className="mb-8">
            <h2 className="mb-2 text-lg font-semibold">{t("analytics.timeSeries")}</h2>
            <TimeSeriesChart series={data.result.series} emptyLabel={t("analytics.empty")} />
          </section>

          <section className="mb-8">
            <h2 className="mb-1 text-lg font-semibold">{t("analytics.trending")}</h2>
            <p className="mb-3 text-xs text-zinc-500">{t("analytics.trendingHint")}</p>
            {data.result.trending.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("analytics.empty")}</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                    <tr>
                      <th className="px-3 py-2">{t("projectForm.projectName")}</th>
                      <th className="px-3 py-2">{t("analytics.category")}</th>
                      <th className="px-3 py-2">{t("analytics.reviewsPerWeek", { count: "" }).replace(/\s+$/, "")}</th>
                      <th className="px-3 py-2">{t("reviews.rating")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.result.trending.slice(0, 15).map((row) => (
                      <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2">{row.category}</td>
                        <td className="px-3 py-2">{row.reviewsPerWeek.toFixed(2)}</td>
                        <td className="px-3 py-2">{row.rating.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">{t("analytics.topCategories")}</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.result.categories.map((item) => (
                <li
                  key={item.category}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                >
                  <span>{item.category}</span>
                  <span className="font-semibold">{item.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold">{value}</p>
    </div>
  );
}
