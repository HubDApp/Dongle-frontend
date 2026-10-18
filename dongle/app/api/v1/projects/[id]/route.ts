import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limiter";
import { PROJECTS } from "@/app/api/graphql/route";
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
 * GET /api/v1/projects/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = auth(request);
  if (!authResult.ok) return authResult.response!;

  const project = PROJECTS.find((p) => p.id === params.id);
  if (!project) {
    return NextResponse.json(createErrorResponse(ErrorCode.NOT_FOUND, "Project not found", 404), { status: 404, headers: corsHeaders() });
  }
  return NextResponse.json(createSuccessResponse({ data: project }), { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
