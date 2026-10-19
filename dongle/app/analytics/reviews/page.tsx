"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Download, Eye, Flag, MessageSquare, ThumbsUp, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import WalletGate from "@/components/wallet/WalletGate";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { downloadCsv, toCsv } from "@/lib/analytics-dashboard/csv";
import { computeReviewAnalytics } from "@/lib/review-analytics";
import { projectService } from "@/services/project/project.service";
import { reviewAnalyticsService } from "@/services/review/review-analytics.service";
import { reviewReportService } from "@/services/review/review-report.service";
import { reviewService } from "@/services/review/review.service";
import { ALL_CATEGORIES, type ProjectCategory } from "@/types/project";
import type { Review } from "@/types/review";

const ADMIN_PURPOSE = "Connect an authorized admin Freighter wallet to access review analytics.";

function getDefaultDates() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatRatio(value: number | null): string {
  return value === null ? "No votes" : `${(value * 100).toFixed(1)}%`;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Eye }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

export default function ReviewAnalyticsPage() {
  const { isAdmin, gate } = useAdminAccess();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("all");
  const [category, setCategory] = useState<ProjectCategory | "all">("all");
  const defaultDates = useMemo(getDefaultDates, []);
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [reports, setReports] = useState(() => reviewReportService.getReports());

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    void reviewService.getReviews()
      .then((loaded) => {
        if (cancelled) return;
        setReviews(loaded);
        setReports(reviewReportService.getReports());
        setViewCounts(reviewAnalyticsService.getViewCounts());
      })
      .catch(() => {
        if (!cancelled) setError("Review analytics could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const projects = useMemo(() => projectService.getAllProjects(), []);
  const analytics = useMemo(
    () => computeReviewAnalytics(reviews, projects, reports, viewCounts, {
      projectId,
      category,
      startDate,
      endDate,
    }),
    [reviews, projects, reports, viewCounts, projectId, category, startDate, endDate],
  );

  const exportCsv = () => {
    const headers = [
      "review_id", "project", "category", "reviewer", "created_at", "helpful_votes",
      "total_votes", "helpfulness_ratio", "views", "responses", "reports", "engagement_score",
    ];
    const rows = analytics.reviews.map((row) => [
      row.review.id,
      row.projectName,
      row.category,
      row.review.userAddress,
      row.review.createdAt,
      row.helpfulVotes,
      row.totalVotes,
      row.helpfulnessRatio,
      row.viewCount,
      row.responseCount,
      row.reportCount,
      row.engagementScore,
    ]);
    downloadCsv(`dongle-review-analytics-${startDate}-${endDate}.csv`, toCsv(headers, rows));
  };

  if (gate.state !== "ready") {
    return (
      <main className="container mx-auto min-h-screen max-w-2xl px-4 py-32">
        <WalletGate gate={gate} pagePurpose={ADMIN_PURPOSE} loadingMessage="Verifying wallet access..." />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-5 h-10 w-10 text-red-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Access Restricted</h1>
        <p className="mt-2 max-w-md text-zinc-500 dark:text-zinc-400">
          Your wallet is not on the admin allowlist. Connect an authorized admin wallet to view review analytics.
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <BarChart3 className="h-7 w-7 text-emerald-600" aria-hidden="true" />
            Review Quality Analytics
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Helpfulness, engagement, and reviewer quality across project reviews.
          </p>
        </div>
        <Button onClick={exportCsv} disabled={loading} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
      </header>

      <fieldset className="mb-6 grid grid-cols-1 gap-4 border-y border-zinc-200 py-4 dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">Review analytics filters</legend>
        <label className="flex flex-col gap-1 text-sm">
          <span>Project</span>
          <select className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="all">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Category</span>
          <select className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={category} onChange={(event) => setCategory(event.target.value as ProjectCategory | "all")}>
            <option value="all">All categories</option>
            {ALL_CATEGORIES.filter((value) => value !== "All").map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>From</span>
          <input type="date" className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>To</span>
          <input type="date" className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
        </label>
      </fieldset>

      {error ? <p role="alert" className="mb-4 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="py-8 text-sm text-zinc-500">Loading review analytics...</p> : null}

      {!loading ? (
        <>
          <section aria-label="Review metrics" className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Reviews" value={String(analytics.summary.reviewCount)} icon={MessageSquare} />
            <Metric label="Helpfulness" value={formatRatio(analytics.summary.averageHelpfulness)} icon={ThumbsUp} />
            <Metric label="Views" value={String(analytics.summary.totalViews)} icon={Eye} />
            <Metric label="Responses" value={String(analytics.summary.totalResponses)} icon={TrendingUp} />
            <Metric label="Reports" value={String(analytics.summary.totalReports)} icon={Flag} />
          </section>

          <section className="mb-9" aria-labelledby="top-reviews-heading">
            <h2 id="top-reviews-heading" className="mb-3 text-lg font-semibold">Top Reviews</h2>
            {analytics.reviews.length === 0 ? <p className="py-8 text-sm text-zinc-500">No reviews match these filters.</p> : (
              <div className="overflow-x-auto border-y border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="text-xs text-zinc-500">
                    <tr>{["Project / review", "Reviewer", "Helpful", "Views", "Responses", "Reports", "Score"].map((label) => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {analytics.reviews.slice(0, 20).map((row) => (
                      <tr key={row.review.id} className="border-t border-zinc-100 align-top dark:border-zinc-800">
                        <td className="max-w-sm px-3 py-3">
                          <div className="font-medium">{row.projectName}</div>
                          <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{row.review.comment}</p>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">{row.review.userAddress}</td>
                        <td className="px-3 py-3 tabular-nums">{formatRatio(row.helpfulnessRatio)}</td>
                        <td className="px-3 py-3 tabular-nums">{row.viewCount}</td>
                        <td className="px-3 py-3 tabular-nums">{row.responseCount}</td>
                        <td className="px-3 py-3 tabular-nums">{row.reportCount}</td>
                        <td className="px-3 py-3 font-semibold tabular-nums">{row.engagementScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section aria-labelledby="reviewers-heading">
              <h2 id="reviewers-heading" className="mb-3 text-lg font-semibold">Reviewer Quality</h2>
              <div className="divide-y divide-zinc-100 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {analytics.reviewers.length === 0 ? <p className="py-5 text-sm text-zinc-500">No reviewer data for this range.</p> : analytics.reviewers.slice(0, 10).map((reviewer, index) => (
                  <div key={reviewer.reviewer} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 text-xs text-zinc-400">{index + 1}</span>
                      <span className="truncate font-mono text-xs">{reviewer.reviewer}</span>
                    </div>
                    <span className="shrink-0 tabular-nums">{formatRatio(reviewer.averageHelpfulness)} · {reviewer.reviewCount} reviews</span>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="trends-heading">
              <h2 id="trends-heading" className="mb-3 text-lg font-semibold">Review Quality Trends</h2>
              {analytics.trends.length === 0 ? <p className="border-y border-zinc-200 py-5 text-sm text-zinc-500 dark:border-zinc-800">No reviews for this range.</p> : (
                <div className="space-y-3 border-y border-zinc-200 py-3 dark:border-zinc-800">
                  {analytics.trends.map((trend) => (
                    <div key={trend.week} className="grid grid-cols-[6rem_1fr_4rem] items-center gap-3 text-xs">
                      <span className="text-zinc-500">Week of {trend.week}</span>
                      <div className="h-2 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800" aria-label={`${formatRatio(trend.helpfulnessRatio)} helpfulness`}>
                        <div className="h-full rounded bg-emerald-600" style={{ width: `${(trend.helpfulnessRatio ?? 0) * 100}%` }} />
                      </div>
                      <span className="text-right tabular-nums">{formatRatio(trend.helpfulnessRatio)}</span>
                      <span className="col-start-2 col-span-2 -mt-2 text-zinc-400">{trend.reviewCount} reviews</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </main>
  );
}