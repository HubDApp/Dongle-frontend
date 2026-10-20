import { reviewsPerWeekForProject, type AnalyticsDataset } from "@/lib/analytics-dashboard/metrics";
import type { Project } from "@/types/project";

export type SocialProofType = "featured" | "trending" | "highly-rated" | "bookmarks" | "new";

export interface SocialProofBadge {
  type: SocialProofType;
  label: string;
  tooltip: string;
}

export type SocialProofByProject = Record<string, SocialProofBadge[]>;

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIORITY: Record<SocialProofType, number> = {
  featured: 0,
  trending: 1,
  "highly-rated": 2,
  bookmarks: 3,
  new: 4,
};

export function computeSocialProof(
  dataset: AnalyticsDataset,
  now = new Date(),
): SocialProofByProject {
  const byCategory = new Map<string, Project[]>();
  for (const project of dataset.projects) {
    const categoryProjects = byCategory.get(project.primaryCategory) ?? [];
    categoryProjects.push(project);
    byCategory.set(project.primaryCategory, categoryProjects);
  }

  const trendingIds = new Set<string>();
  for (const categoryProjects of byCategory.values()) {
    categoryProjects
      .sort((a, b) =>
        reviewsPerWeekForProject(b, dataset.reviews, now, 7) -
          reviewsPerWeekForProject(a, dataset.reviews, now, 7) ||
        b.rating - a.rating,
      )
      .slice(0, 10)
      .forEach((project) => trendingIds.add(project.id));
  }

  const result: SocialProofByProject = {};
  for (const project of dataset.projects) {
    const badges: SocialProofBadge[] = [];
    if (project.isFeatured) {
      badges.push({ type: "featured", label: "⭐ Featured", tooltip: "Selected by the Dongle admin team." });
    }
    if (trendingIds.has(project.id)) {
      badges.push({
        type: "trending",
        label: "🔥 Trending",
        tooltip: `Among the top 10 projects in ${project.primaryCategory} by review activity this week.`,
      });
    }
    if (project.rating >= 4.5 && project.reviews >= 20) {
      badges.push({
        type: "highly-rated",
        label: "✅ Highly rated",
        tooltip: "Rated at least 4.5 stars from 20 or more reviews.",
      });
    }
    if ((project.bookmarkCount ?? 0) > 50) {
      badges.push({
        type: "bookmarks",
        label: `📊 ${project.bookmarkCount} bookmarks`,
        tooltip: `Bookmarked by ${project.bookmarkCount} users; this badge requires more than 50 bookmarks.`,
      });
    }
    const createdAt = new Date(project.createdAt).getTime();
    if (Number.isFinite(createdAt) && createdAt >= now.getTime() - 7 * DAY_MS && createdAt <= now.getTime()) {
      badges.push({ type: "new", label: "🆕 New", tooltip: "Added to Dongle within the last 7 days." });
    }
    result[project.id] = badges.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]).slice(0, 2);
  }
  return result;
}

export function secondsUntilUtcMidnight(now = new Date()): number {
  const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextMidnight - now.getTime()) / 1000));
}