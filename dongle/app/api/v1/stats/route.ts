import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limiter";
import { PROJECTS, REVIEWS, USERS } from "@/app/api/graphql/route";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

const API_KEY_HEADER = "x-api-key";

function auth(request: NextRequest): { ok: boolean; response?: NextResponse } {
  const key = request.headers.get(API_KEY_HEADER);
  if (!key) {
    return { ok: false, response: NextResponse.json(createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "Missing X-API-Key", 401), { status: 401 }) };
  }
  const rl = rateLimit(`rest:${key}`, 100, 60 * 1000);
  if (!rl.allowed) {
    return { ok: false, response: NextResponse.json(createErrorResponse(ErrorCode.RATE_LIMITED, "Rate limit exceeded", 429), { status: 429 }) };
  }
  return { ok: true };
}

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  };
}

/**
 * GET /api/v1/stats — aggregate platform metrics.
 */
export async function GET(request: NextRequest) {
  const authResult = auth(request);
  if (!authResult.ok) return authResult.response!;

  const stats = {
    totalProjects: PROJECTS.length,
    totalReviews: REVIEWS.length,
    totalUsers: USERS.length,
    averageRating: REVIEWS.length
      ? (REVIEWS.reduce((sum, r) => sum + r.rating, 0) / REVIEWS.length).toFixed(2)
      : "0",
    categories: Object.values(
      PROJECTS.reduce(
        (acc: Record<string, number>, p) => {
          acc[p.primaryCategory] = (acc[p.primaryCategory] || 0) + 1;
          return acc;
        },
        {},
      ),
    ),
  };
  return NextResponse.json(createSuccessResponse({ data: stats }), { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
