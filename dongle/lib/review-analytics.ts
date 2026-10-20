import type { Project, ProjectCategory } from "@/types/project";
import type { Review, ReviewReport } from "@/types/review";

export interface ReviewAnalyticsFilters {
  projectId: string;
  category: ProjectCategory | "all";
  startDate: string;
  endDate: string;
}

export interface ReviewMetricRow {
  review: Review;
  projectName: string;
  category: ProjectCategory | "Unknown";
  helpfulVotes: number;
  totalVotes: number;
  helpfulnessRatio: number | null;
  viewCount: number;
  responseCount: number;
  reportCount: number;
  engagementScore: number;
}

export interface ReviewerQuality {
  reviewer: string;
  averageHelpfulness: number | null;
  reviewCount: number;
}

export interface ReviewQualityTrend {
  week: string;
  helpfulnessRatio: number | null;
  reviewCount: number;
}

export interface ReviewAnalyticsResult {
  reviews: ReviewMetricRow[];
  reviewers: ReviewerQuality[];
  trends: ReviewQualityTrend[];
  summary: {
    reviewCount: number;
    averageHelpfulness: number | null;
    totalViews: number;
    totalResponses: number;
    totalReports: number;
  };
}

function countVotes(votes: string[] | undefined): number {
  return new Set(votes ?? []).size;
}

function getWeekStart(date: string): string {
  const day = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) return "";
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - daysSinceMonday);
  return day.toISOString().slice(0, 10);
}

function engagementScore(
  helpfulnessRatio: number | null,
  totalVotes: number,
  viewCount: number,
  responseCount: number,
  reportCount: number,
): number {
  const helpfulness = (helpfulnessRatio ?? 0) * 60;
  const votes = Math.min(15, Math.log2(totalVotes + 1) * 5);
  const views = Math.min(10, Math.log2(viewCount + 1) * 2);
  const responses = Math.min(10, responseCount * 2);
  const reports = Math.min(15, reportCount * 5);
  return Math.round(Math.max(0, Math.min(100, helpfulness + votes + views + responses - reports)));
}

export function computeReviewAnalytics(
  reviews: Review[],
  projects: Project[],
  reports: ReviewReport[],
  viewCounts: Record<string, number>,
  filters: ReviewAnalyticsFilters,
): ReviewAnalyticsResult {
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const reportsByReview = new Map<string, number>();
  for (const report of reports) {
    reportsByReview.set(report.reviewId, (reportsByReview.get(report.reviewId) ?? 0) + 1);
  }

  const filtered = reviews.filter((review) => {
    const project = projectsById.get(review.projectId);
    if (filters.projectId !== "all" && review.projectId !== filters.projectId) return false;
    if (filters.category !== "all" && project?.primaryCategory !== filters.category) return false;
    const reviewDate = review.createdAt.slice(0, 10);
    if (filters.startDate && reviewDate < filters.startDate) return false;
    if (filters.endDate && reviewDate > filters.endDate) return false;
    return true;
  });

  const rows = filtered.map((review): ReviewMetricRow => {
    const helpfulVotes = countVotes(review.helpfulVotes);
    const totalVotes = helpfulVotes + countVotes(review.unhelpfulVotes);
    const helpfulnessRatio = totalVotes > 0 ? helpfulVotes / totalVotes : null;
    const viewCount = Math.max(0, viewCounts[review.id] ?? 0);
    const reportCount = reportsByReview.get(review.id) ?? 0;
    const responseCount = 0;

    return {
      review,
      projectName: projectsById.get(review.projectId)?.name ?? review.projectName,
      category: projectsById.get(review.projectId)?.primaryCategory ?? "Unknown",
      helpfulVotes,
      totalVotes,
      helpfulnessRatio,
      viewCount,
      responseCount,
      reportCount,
      engagementScore: engagementScore(
        helpfulnessRatio,
        totalVotes,
        viewCount,
        responseCount,
        reportCount,
      ),
    };
  });

  const reviewerScores = new Map<string, { total: number; count: number; reviews: number }>();
  const weeklyScores = new Map<string, { helpful: number; votes: number; reviews: number }>();
  let totalHelpfulVotes = 0;
  let totalVotes = 0;

  for (const row of rows) {
    const reviewer = reviewerScores.get(row.review.userAddress) ?? { total: 0, count: 0, reviews: 0 };
    reviewer.reviews += 1;
    if (row.helpfulnessRatio !== null) {
      reviewer.total += row.helpfulnessRatio;
      reviewer.count += 1;
    }
    reviewerScores.set(row.review.userAddress, reviewer);

    const week = getWeekStart(row.review.createdAt);
    if (week) {
      const score = weeklyScores.get(week) ?? { helpful: 0, votes: 0, reviews: 0 };
      score.helpful += row.helpfulVotes;
      score.votes += row.totalVotes;
      score.reviews += 1;
      weeklyScores.set(week, score);
    }
    totalHelpfulVotes += row.helpfulVotes;
    totalVotes += row.totalVotes;
  }

  const reviewers = [...reviewerScores.entries()]
    .map(([reviewer, score]) => ({
      reviewer,
      averageHelpfulness: score.count > 0 ? score.total / score.count : null,
      reviewCount: score.reviews,
    }))
    .sort((a, b) =>
      (b.averageHelpfulness ?? -1) - (a.averageHelpfulness ?? -1) ||
      b.reviewCount - a.reviewCount,
    );

  const trends = [...weeklyScores.entries()]
    .map(([week, score]) => ({
      week,
      helpfulnessRatio: score.votes > 0 ? score.helpful / score.votes : null,
      reviewCount: score.reviews,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return {
    reviews: rows.sort(
      (a, b) => b.engagementScore - a.engagementScore || b.viewCount - a.viewCount,
    ),
    reviewers,
    trends,
    summary: {
      reviewCount: rows.length,
      averageHelpfulness: totalVotes > 0 ? totalHelpfulVotes / totalVotes : null,
      totalViews: rows.reduce((sum, row) => sum + row.viewCount, 0),
      totalResponses: rows.reduce((sum, row) => sum + row.responseCount, 0),
      totalReports: rows.reduce((sum, row) => sum + row.reportCount, 0),
    },
  };
}