import { NextResponse } from "next/server";
import { queryAnalytics } from "@/lib/analytics-dashboard/query";
import type { AnalyticsRange, VerificationFilter } from "@/lib/analytics-dashboard/metrics";
import type { ProjectCategory } from "@/types/project";
import { isValidCategory } from "@/types/project";

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
    const payload = await queryAnalytics({
      range,
      category,
      verificationStatus,
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[analytics] query failed", error);
    return NextResponse.json(
      { error: "Could not load analytics" },
      { status: 500 },
    );
  }
}
