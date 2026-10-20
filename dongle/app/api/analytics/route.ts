import { NextResponse } from "next/server";
import { queryAnalytics } from "@/lib/analytics-dashboard/query";
import type { AnalyticsRange, VerificationFilter } from "@/lib/analytics-dashboard/metrics";
import type { ProjectCategory } from "@/types/project";
import { isValidCategory } from "@/types/project";
import { cacheGet, cacheSet, CacheKey, TRENDING_TTL_S } from "@/lib/cache";
import type { TrendingProject } from "@/lib/analytics-dashboard/metrics";

export const dynamic = "force-dynamic";

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "all"];
const STATUSES: VerificationFilter[] = ["all", "VERIFIED", "PENDING", "REJECTED", "NONE"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range") ?? "30d";
  const categoryParam = url.searchParams.get("category") ?? "all";
  const statusParam = url.searchParams.get("status") ?? "all";

  const range = (RANGES as string[]).includes(rangeParam)
    ? (rangeParam as AnalyticsRange)
    : "30d";
  const verificationStatus = (STATUSES as string[]).includes(statusParam)
    ? (statusParam as VerificationFilter)
    : "all";
  const category: ProjectCategory | "all" =
    categoryParam === "all"
      ? "all"
      : isValidCategory(categoryParam)
        ? categoryParam
        : "all";

  try {
    // For the 7d range with default filters, serve trending list from Redis cache
    const isTrendingQuery =
      range === "7d" && category === "all" && verificationStatus === "all";

    if (isTrendingQuery) {
      const cachedTrending = await cacheGet<TrendingProject[]>(CacheKey.trending7d());
      if (cachedTrending) {
        const payload = await queryAnalytics({ range, category, verificationStatus });
        return NextResponse.json({ ...payload, result: { ...payload.result, trending: cachedTrending } });
      }
    }

    const payload = await queryAnalytics({
      range,
      category,
      verificationStatus,
    });

    // Populate the trending:7d Redis cache
    if (isTrendingQuery && payload.result.trending.length > 0) {
      await cacheSet(CacheKey.trending7d(), payload.result.trending, TRENDING_TTL_S);
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[analytics] query failed", error);
    return NextResponse.json(
      { error: "Could not load analytics" },
      { status: 500 },
    );
  }
}
