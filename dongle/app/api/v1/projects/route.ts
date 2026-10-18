import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limiter";
import { PROJECTS, REVIEWS, USERS } from "@/app/api/graphql/route";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

const API_KEY_HEADER = "x-api-key";
const RATE_LIMIT = 100; // 100 req/min
const RATE_WINDOW = 60 * 1000;

function auth(request: NextRequest): { ok: boolean; key?: string; response?: NextResponse } {
  const key = request.headers.get(API_KEY_HEADER);
  if (!key) {
    return { ok: false, response: NextResponse.json(createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "Missing X-API-Key", 401), { status: 401 }) };
  }
  const rl = rateLimit(`rest:${key}`, RATE_LIMIT, RATE_WINDOW);
  if (!rl.allowed) {
    return { ok: false, response: NextResponse.json(createErrorResponse(ErrorCode.RATE_LIMITED, "Rate limit exceeded", 429), { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }) };
  }
  return { ok: true, key };
}

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  };
}

/**
 * GET /api/v1/projects — paginated/filtered project listing.
 */
export async function GET(request: NextRequest) {
  const authResult = auth(request);
  if (!authResult.ok) return authResult.response!;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "10")));
  const category = searchParams.get("category") || undefined;

  let list = PROJECTS;
  if (category) list = list.filter((p) => p.primaryCategory === category);

  const total = list.length;
  const start = (page - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  return NextResponse.json(
    createSuccessResponse({
      data: pageItems,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    }),
    { headers: corsHeaders() },
  );
}

/**
 * OPTIONS for CORS preflight.
 */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
