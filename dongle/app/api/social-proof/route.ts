import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";
import { getOrRefreshAnalytics } from "@/lib/analytics-dashboard/query";
import { computeSocialProof, secondsUntilUtcMidnight, type SocialProofByProject } from "@/lib/social-proof";
import { getProjectBookmarkCount } from "@/services/project/bookmark-metrics.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const key = `social-proof:${dayKey}`;

  try {
    const cached = await cacheGet<SocialProofByProject>(key);
    if (cached) return NextResponse.json({ badges: cached, generatedAt: `${dayKey}T00:00:00.000Z` });

    const analytics = await getOrRefreshAnalytics(now);
    const bookmarkCounts = await Promise.all(analytics.dataset.projects.map(async (project) => [
      project.id,
      Math.max(project.bookmarkCount ?? 0, await getProjectBookmarkCount(project.id)),
    ] as const));
    const featuredProjectIds = new Set(
      (process.env.SOCIAL_PROOF_FEATURED_PROJECT_IDS ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    );
    const projects = analytics.dataset.projects.map((project) => ({
      ...project,
      isFeatured: project.isFeatured || featuredProjectIds.has(project.id),
      bookmarkCount: new Map(bookmarkCounts).get(project.id) ?? project.bookmarkCount,
    }));
    const badges = computeSocialProof({ ...analytics.dataset, projects }, now);
    await cacheSet(key, badges, secondsUntilUtcMidnight(now));
    return NextResponse.json({ badges, generatedAt: now.toISOString() });
  } catch (error) {
    console.error("[social-proof] metric refresh failed", error);
    return NextResponse.json({ error: "Could not load social proof metrics" }, { status: 500 });
  }
}