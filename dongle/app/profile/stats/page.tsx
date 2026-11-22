"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WalletGate from "@/components/wallet/WalletGate";
import { useWalletPageGate } from "@/hooks/useWalletPageGate";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { LineChart } from "@/components/analytics/LineChart";
import { PieChart } from "@/components/analytics/PieChart";
import { reviewService } from "@/services/review/review.service";
import { projectService } from "@/services/project/project.service";
import {
  recentViewsService,
  type RecentView,
} from "@/services/recent-views/recent-views.service";
import type { Review } from "@/types/review";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Download,
  Eye,
  Lock,
  MessageSquare,
  Star,
} from "lucide-react";

type RangeKey = "7d" | "30d" | "90d" | "all";

const RANGE_DAYS: Record<Exclude<RangeKey, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const FIRST_SEEN_PREFIX = "dongle_profile_first_seen:";
const PAGE_PURPOSE =
  "Connect your Stellar wallet to view your personal stats. Only you can see this page.";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDay(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function readFirstSeen(walletAddress: string): string {
  const key = `${FIRST_SEEN_PREFIX}${walletAddress}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
    const now = new Date().toISOString();
    localStorage.setItem(key, now);
    return now;
  } catch {
    return new Date().toISOString();
  }
}

function buildReviewSeries(reviews: Review[]) {
  const counts = new Map<string, number>();

  for (const review of reviews) {
    const parsed = new Date(review.createdAt);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = parsed.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      label: formatDay(date),
      value,
    }));
}

function buildCategoryInterests(reviews: Review[], views: RecentView[]) {
  const counts = new Map<string, number>();

  const addProject = (projectId: string) => {
    const project = projectService.getProjectById(projectId);
    const category = project?.primaryCategory ?? "Other";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  };

  reviews.forEach((review) => addProject(review.projectId));
  views.forEach((view) => addProject(view.projectId));

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({ label, value }));
}

export default function PersonalStatsPage() {
  const gate = useWalletPageGate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [views, setViews] = useState<RecentView[]>([]);
  const [firstSeen, setFirstSeen] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gate.publicKey) return;

    const walletAddress = gate.publicKey;
    let cancelled = false;

    setLoading(true);
    setError(null);

    void Promise.all([
      reviewService.getReviewsByUser(walletAddress),
      reviewService.getReviews(),
    ])
      .then(([mine, all]) => {
        if (cancelled) return;
        setReviews(mine);
        setAllReviews(all);
        setViews(recentViewsService.getAllViews(walletAddress));
        setFirstSeen(readFirstSeen(walletAddress));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your personal stats.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gate.publicKey]);

  const cutoff = useMemo(
    () =>
      range === "all"
        ? 0
        : Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000,
    [range],
  );

  const filteredReviews = useMemo(
    () =>
      reviews.filter(
        (review) => new Date(review.createdAt).getTime() >= cutoff,
      ),
    [reviews, cutoff],
  );

  const filteredViews = useMemo(
    () => views.filter((view) => new Date(view.viewedAt).getTime() >= cutoff),
    [views, cutoff],
  );

  const projectsViewed = useMemo(
    () => new Set(filteredViews.map((view) => view.projectId)).size,
    [filteredViews],
  );

  const averageRating = useMemo(
    () => average(filteredReviews.map((review) => review.rating)),
    [filteredReviews],
  );

  const allTimeAverageRating = useMemo(
    () => average(reviews.map((review) => review.rating)),
    [reviews],
  );

  const memberSince = useMemo(() => {
    const dates = [
      firstSeen,
      ...reviews.map((review) => review.createdAt),
      ...views.map((view) => view.viewedAt),
    ].filter((value): value is string => Boolean(value));

    if (dates.length === 0) return null;
    return dates.reduce((earliest, current) =>
      new Date(current) < new Date(earliest) ? current : earliest,
    );
  }, [firstSeen, reviews, views]);

  const daysOnPlatform = useMemo(() => {
    if (!memberSince) return 0;
    const started = new Date(memberSince).getTime();
    if (Number.isNaN(started)) return 0;
    return Math.max(
      0,
      Math.floor((Date.now() - started) / (24 * 60 * 60 * 1000)),
    );
  }, [memberSince]);

  const reviewSeries = useMemo(
    () => buildReviewSeries(filteredReviews),
    [filteredReviews],
  );

  const categoryInterests = useMemo(
    () => buildCategoryInterests(filteredReviews, filteredViews),
    [filteredReviews, filteredViews],
  );

  const badges = useMemo(() => {
    const list = [
      {
        id: "first-review",
        label: "First review",
        description: "Submit your first project review.",
        earned: reviews.length >= 1,
        icon: MessageSquare,
      },
      {
        id: "five-reviews",
        label: "Prolific reviewer",
        description: "Submit five reviews.",
        earned: reviews.length >= 5,
        icon: Award,
      },
      {
        id: "ten-reviews",
        label: "Trusted voice",
        description: "Submit ten reviews.",
        earned: reviews.length >= 10,
        icon: Star,
      },
      {
        id: "explorer",
        label: "Explorer",
        description: "View five different projects.",
        earned: new Set(views.map((view) => view.projectId)).size >= 5,
        icon: Eye,
      },
      {
        id: "balanced-critic",
        label: "Balanced critic",
        description: "Give an average rating of 4.0 or higher across three reviews.",
        earned:
          reviews.length >= 3 &&
          allTimeAverageRating != null &&
          allTimeAverageRating >= 4,
        icon: Award,
      },
    ];

    return list;
  }, [reviews, views, allTimeAverageRating]);

  const community = useMemo(() => {
    const projects = projectService.getAllProjects();
    const projectRatings = projects
      .map((project) => project.rating)
      .filter((rating) => Number.isFinite(rating));
    const reviewRatings = allReviews
      .map((review) => review.rating)
      .filter((rating) => Number.isFinite(rating));
    const reviewers = new Set(allReviews.map((review) => review.userAddress));

    return {
      averageRating: average(reviewRatings) ?? average(projectRatings),
      reviewsPerReviewer:
        reviewers.size > 0 ? allReviews.length / reviewers.size : 0,
    };
  }, [allReviews]);

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      walletAddress: gate.publicKey,
      range,
      memberSince,
      metrics: {
        reviewsSubmitted: filteredReviews.length,
        averageRatingGiven: averageRating,
        projectsViewed,
        daysOnPlatform,
      },
      badges: badges.map((badge) => ({
        id: badge.id,
        label: badge.label,
        description: badge.description,
        earned: badge.earned,
      })),
      reviews,
      viewedProjects: views,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dongle-personal-stats-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (gate.state !== "ready") {
    return (
      <div className="min-h-screen bg-zinc-50 pb-24 pt-32 dark:bg-zinc-950">
        <div className="container mx-auto max-w-2xl px-4">
          <WalletGate
            gate={gate}
            pagePurpose={PAGE_PURPOSE}
            loadingMessage="Loading your personal stats..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 pt-32 dark:bg-zinc-950">
      <div className="container mx-auto max-w-6xl px-4">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/profile"
              className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to profile
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">
              Personal stats
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Your reviews, interests, and milestones. Only you can see this
              page.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">
              Date range
              <select
                className="mt-1 block rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={range}
                onChange={(event) =>
                  setRange(event.target.value as RangeKey)
                }
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </label>
            <Button
              variant="outline"
              onClick={exportJson}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export JSON
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <Card className="border-red-200 p-6 text-sm text-red-600 dark:border-red-900 dark:text-red-400">
            {error}
          </Card>
        ) : (
          <div className="space-y-8">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Reviews submitted"
                value={String(filteredReviews.length)}
                icon={MessageSquare}
              />
              <MetricCard
                label="Average rating given"
                value={
                  averageRating == null ? "—" : averageRating.toFixed(1)
                }
                icon={Star}
              />
              <MetricCard
                label="Projects viewed"
                value={String(projectsViewed)}
                icon={Eye}
              />
              <MetricCard
                label="Time on platform"
                value={
                  daysOnPlatform === 0
                    ? "Today"
                    : `${daysOnPlatform} day${daysOnPlatform === 1 ? "" : "s"}`
                }
                icon={CalendarDays}
              />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h2 className="text-lg font-semibold">Reviews over time</h2>
                <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Reviews you submitted in the selected date range.
                </p>
                <LineChart data={reviewSeries} height={220} />
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold">Category interests</h2>
                <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Categories from the projects you reviewed or viewed.
                </p>
                <PieChart data={categoryInterests} size={180} />
              </Card>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h2 className="text-lg font-semibold">Badges & achievements</h2>
                <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Milestones are based on your all-time activity.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {badges.map((badge) => {
                    const Icon = badge.icon;
                    return (
                      <div
                        key={badge.id}
                        className={`flex items-start gap-3 rounded-2xl border p-4 ${
                            badge.earned
                              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                              : "border-zinc-200 opacity-70 dark:border-zinc-800"
                          }`}
                      >
                        <div className="mt-0.5 rounded-full bg-white p-2 dark:bg-zinc-900">
                          {badge.earned ? (
                            <Icon
                              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                              aria-hidden="true"
                            />
                          ) : (
                            <Lock
                              className="h-4 w-4 text-zinc-400"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{badge.label}</p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {badge.description}
                          </p>
                          <p className="mt-1 text-xs font-medium">
                            {badge.earned ? "Earned" : "Locked"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold">How you compare</h2>
                <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  A snapshot against community averages.
                </p>
                <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                      <tr>
                        <th className="px-4 py-3">Metric</th>
                        <th className="px-4 py-3">You</th>
                        <th className="px-4 py-3">Community</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-4 py-3">Average rating given</td>
                        <td className="px-4 py-3 font-semibold">
                          {averageRating == null
                            ? "—"
                            : averageRating.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                          {community.averageRating == null
                            ? "—"
                            : community.averageRating.toFixed(1)}
                        </td>
                      </tr>
                      <tr className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-4 py-3">Reviews submitted</td>
                        <td className="px-4 py-3 font-semibold">
                          {filteredReviews.length}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                          {community.reviewsPerReviewer.toFixed(1)} avg /
                          reviewer
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {memberSince ? (
                  <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Member since {new Date(memberSince).toLocaleDateString()}.
                  </p>
                ) : null}
              </Card>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof MessageSquare;
}) {
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
