import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse, ErrorCode } from "@/services/error/error.service";
import { getReviewStore } from "@/lib/review-store";
import { searchReviews } from "@/utils/review-search.util";

function parseNumber(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null || value === "") return undefined;
  return value === "true" || value === "1";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const ratingMin = parseNumber(searchParams.get("ratingMin"));
    const ratingMax = parseNumber(searchParams.get("ratingMax"));
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;
    const verifiedOnly = parseBoolean(searchParams.get("verifiedOnly"));
    const language = searchParams.get("language") ?? undefined;
    const sort = searchParams.get("sort") === "date" ? "date" : "relevance";
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));

    const reviews = Array.from(getReviewStore().values());
    const result = searchReviews(reviews, {
      query,
      ratingMin,
      ratingMax,
      dateFrom,
      dateTo,
      verifiedOnly,
      language,
      sort,
      page,
      pageSize,
    });

    return NextResponse.json(createSuccessResponse(result));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Failed to search reviews", 500),
      { status: 500 },
    );
  }
}
