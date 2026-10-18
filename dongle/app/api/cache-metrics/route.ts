/**
 * GET /api/cache-metrics
 *
 * Returns current Redis cache hit-rate statistics per key prefix.
 * Useful for monitoring cache effectiveness in production.
 *
 * Access is restricted to admin tokens (same as other admin routes).
 */

import { NextRequest, NextResponse } from "next/server";
import { getMetrics } from "@/lib/cache";
import { redisAvailable } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Light auth guard: require the same admin token used elsewhere
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_JWT_SECRET;
  if (adminToken && authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrics = getMetrics();

  return NextResponse.json({
    redisAvailable,
    metrics,
    timestamp: new Date().toISOString(),
  });
}
