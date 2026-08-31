/**
 * Analytics metric calculations.
 *
 * reviews/week (trending):
 *   When individual review timestamps exist, count reviews whose createdAt
 *   falls in the last 7 days of the selected window (or the window itself
 *   if shorter), then normalize to a weekly rate:
 *     weeklyRate = reviewCountInWindow * (7 / windowDays)
 *   When only a catalog review total is available, use:
 *     weeklyRate = totalReviews / max(1, weeksSinceCreated)
 *   Projects are ranked by weeklyRate descending (ties broken by rating).
 *
 * New projects/week:
 *   Count of projects with createdAt in the last 7 days of the selected
 *   range, normalized to a weekly rate the same way.
 *
 * Verification rate:
 *   verifiedCount / max(1, verifiedCount + rejectedCount + pendingCount)
 *   for projects that have a known verification status in the snapshot.
 *
 * Average rating: arithmetic mean of project.rating in the filtered set.
 * Median review count: median of project.reviews in the filtered set.
 */

import type { Project, ProjectCategory } from "@/types/project";

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";
export type VerificationFilter = "all" | "VERIFIED" | "PENDING" | "REJECTED" | "NONE";

export interface AnalyticsReview {
  id: string;
  projectId: string;
  createdAt: string;
  rating?: number;
}

export interface AnalyticsVerification {
  projectId: string;
  status: "VERIFIED" | "PENDING" | "REJECTED" | "NONE";
  updatedAt?: string;
}

export interface AnalyticsDataset {
  projects: Project[];
  reviews: AnalyticsReview[];
  verifications: AnalyticsVerification[];
}

export interface AnalyticsFilters {
  range: AnalyticsRange;
  category: ProjectCategory | "all";
  verificationStatus: VerificationFilter;
  now?: Date;
}

export interface TimeSeriesPoint {
  date: string;
  projects: number;
  reviews: number;
  verificationRate: number | null;
}

export interface TrendingProject {
  id: string;
  name: string;
  category: ProjectCategory;
  reviewsPerWeek: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface AnalyticsSummary {
  averageRating: number | null;
  medianReviewCount: number | null;
  verificationApprovalRate: number | null;
  newProjectsPerWeek: number;
  totalProjects: number;
  totalReviews: number;
}

export interface AnalyticsResult {
  trending: TrendingProject[];
  categories: CategoryCount[];
  summary: AnalyticsSummary;
  series: TimeSeriesPoint[];
  generatedAt: string;
}

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;

export function rangeToMs(range: AnalyticsRange): number | null {
  switch (range) {
    case "7d":
      return 7 * MS_DAY;
    case "30d":
      return 30 * MS_DAY;
    case "90d":
      return 90 * MS_DAY;
    case "all":
      return null;
    default:
      return null;
  }
}

export function rangeDays(range: AnalyticsRange, now: Date, earliest: Date): number {
  const ms = rangeToMs(range);
  if (ms == null) {
    return Math.max(1, (now.getTime() - earliest.getTime()) / MS_DAY);
  }
  return ms / MS_DAY;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function nextUtcMidnight(from: Date): Date {
  const day = startOfUtcDay(from);
  return new Date(day.getTime() + MS_DAY);
}

export function isCacheFresh(generatedAtIso: string, now: Date = new Date()): boolean {
  const generated = new Date(generatedAtIso);
  if (Number.isNaN(generated.getTime())) return false;
  return now.getTime() < nextUtcMidnight(generated).getTime();
}

export function weeksSince(createdAt: string, now: Date): number {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 1;
  return Math.max(1, (now.getTime() - created.getTime()) / MS_WEEK);
}

export function filterDataset(
  dataset: AnalyticsDataset,
  filters: AnalyticsFilters,
): AnalyticsDataset {
  const now = filters.now ?? new Date();
  const windowMs = rangeToMs(filters.range);
  const windowStart = windowMs == null ? null : new Date(now.getTime() - windowMs);

  const verByProject = new Map(dataset.verifications.map((v) => [v.projectId, v.status]));

  const projects = dataset.projects.filter((project) => {
    if (filters.category !== "all" && project.primaryCategory !== filters.category) {
      return false;
    }
    if (windowStart && new Date(project.createdAt) < windowStart) {
      return false;
    }
    if (filters.verificationStatus !== "all") {
      const status = verByProject.get(project.id) ?? "NONE";
      if (status !== filters.verificationStatus) return false;
    }
    return true;
  });

  const projectIds = new Set(projects.map((p) => p.id));
  const reviews = dataset.reviews.filter((review) => {
    if (!projectIds.has(review.projectId)) return false;
    if (windowStart && new Date(review.createdAt) < windowStart) return false;
    return true;
  });
  const verifications = dataset.verifications.filter((v) => projectIds.has(v.projectId));

  return { projects, reviews, verifications };
}

export function reviewsPerWeekForProject(
  project: Project,
  reviews: AnalyticsReview[],
  now: Date,
  windowDays: number,
): number {
  const dated = reviews.filter((r) => r.projectId === project.id);
  if (dated.length > 0) {
    const days = Math.max(1, windowDays);
    return dated.length * (7 / days);
  }
  return project.reviews / weeksSince(project.createdAt, now);
}

export function computeTrending(
  dataset: AnalyticsDataset,
  now: Date,
  windowDays: number,
): TrendingProject[] {
  return dataset.projects
    .map((project) => ({
      id: project.id,
      name: project.name,
      category: project.primaryCategory,
      reviewsPerWeek: reviewsPerWeekForProject(project, dataset.reviews, now, windowDays),
      rating: project.rating,
      reviewCount: project.reviews,
      createdAt: project.createdAt,
    }))
    .sort((a, b) => b.reviewsPerWeek - a.reviewsPerWeek || b.rating - a.rating);
}

export function computeCategories(projects: Project[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    counts.set(project.primaryCategory, (counts.get(project.primaryCategory) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

export function computeVerificationApprovalRate(
  verifications: AnalyticsVerification[],
): number | null {
  const decided = verifications.filter(
    (v) => v.status === "VERIFIED" || v.status === "REJECTED",
  );
  if (decided.length === 0) return null;
  const approved = decided.filter((v) => v.status === "VERIFIED").length;
  return approved / decided.length;
}

export function computeTimeSeries(
  dataset: AnalyticsDataset,
  now: Date,
  range: AnalyticsRange,
): TimeSeriesPoint[] {
  const windowMs = rangeToMs(range);
  const start = windowMs == null
    ? startOfUtcDay(
        dataset.projects.reduce((earliest, project) => {
          const created = new Date(project.createdAt);
          return created < earliest ? created : earliest;
        }, now),
      )
    : startOfUtcDay(new Date(now.getTime() - windowMs));

  const end = startOfUtcDay(now);
  const points: TimeSeriesPoint[] = [];
  let cursor = start;
  let verified = 0;
  let decided = 0;

  const verByDay = new Map<string, AnalyticsVerification[]>();
  for (const verification of dataset.verifications) {
    const day = (verification.updatedAt ?? "").slice(0, 10);
    if (!day) continue;
    const list = verByDay.get(day) ?? [];
    list.push(verification);
    verByDay.set(day, list);
  }

  while (cursor.getTime() <= end.getTime()) {
    const iso = cursor.toISOString().slice(0, 10);
    const projects = dataset.projects.filter((p) => p.createdAt.slice(0, 10) <= iso).length;
    const fromCatalog = dataset.projects
      .filter((p) => p.createdAt.slice(0, 10) <= iso)
      .reduce((sum, p) => sum + p.reviews, 0);
    const fromReviews = dataset.reviews.filter((r) => r.createdAt.slice(0, 10) <= iso).length;
    const reviews = dataset.reviews.length > 0 ? fromReviews : fromCatalog;

    for (const verification of verByDay.get(iso) ?? []) {
      if (verification.status === "VERIFIED" || verification.status === "REJECTED") {
        decided += 1;
        if (verification.status === "VERIFIED") verified += 1;
      }
    }

    points.push({
      date: iso,
      projects,
      reviews,
      verificationRate: decided === 0 ? null : verified / decided,
    });
    cursor = new Date(cursor.getTime() + MS_DAY);
  }

  return points;
}

export function computeAnalytics(
  dataset: AnalyticsDataset,
  filters: AnalyticsFilters,
): AnalyticsResult {
  const now = filters.now ?? new Date();
  const filtered = filterDataset(dataset, filters);
  const earliest = filtered.projects.reduce((acc, project) => {
    const created = new Date(project.createdAt);
    return created < acc ? created : acc;
  }, now);
  const days = rangeDays(filters.range, now, earliest);
  const approval = computeVerificationApprovalRate(filtered.verifications);
  const ratings = filtered.projects.map((p) => p.rating).filter((n) => Number.isFinite(n));
  const reviewCounts = filtered.projects.map((p) => p.reviews);
  const weekMs = 7 * MS_DAY;
  const weekStart = new Date(now.getTime() - weekMs);
  const newInLastWeek = filtered.projects.filter((p) => new Date(p.createdAt) >= weekStart).length;

  return {
    trending: computeTrending(filtered, now, days),
    categories: computeCategories(filtered.projects),
    summary: {
      averageRating: mean(ratings),
      medianReviewCount: median(reviewCounts),
      verificationApprovalRate: approval,
      newProjectsPerWeek: newInLastWeek * (7 / Math.max(7, Math.min(days, 7))),
      totalProjects: filtered.projects.length,
      totalReviews:
        filtered.reviews.length > 0
          ? filtered.reviews.length
          : filtered.projects.reduce((sum, p) => sum + p.reviews, 0),
    },
    series: computeTimeSeries(filtered, now, filters.range),
    generatedAt: now.toISOString(),
  };
}
