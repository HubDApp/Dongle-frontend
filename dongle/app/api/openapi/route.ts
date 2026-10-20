import { NextResponse } from "next/server";
import { PUBLIC_API_SPEC } from "@/lib/openapi-public";

/**
 * GET /api/openapi
 * Public OpenAPI 3.1 specification for the /api/v1 REST API (issue #718).
 */
export async function GET() {
  return NextResponse.json(PUBLIC_API_SPEC);
}
