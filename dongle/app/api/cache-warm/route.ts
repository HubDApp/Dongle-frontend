/**
 * POST /api/cache-warm
 *
 * Warms the Redis cache for a list of popular project IDs.
 * Typically called from a cron job or after a deployment to pre-populate
 * the cache before user traffic arrives.
 *
 * Body: { ids: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { warmProjectCache } from "@/lib/project-cache";
import { redisAvailable } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_JWT_SECRET;
  if (adminToken && authHeader !== `Bearer ${adminToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let ids: string[] = [];
  try {
    const body = await request.json();
    if (!Array.isArray(body?.ids)) {
      return NextResponse.json(
        { error: "Body must be { ids: string[] }" },
        { status: 400 },
      );
    }
    ids = body.ids.filter((id: unknown) => typeof id === "string");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await warmProjectCache(ids);

  return NextResponse.json({
    warmed: ids.length,
    redisAvailable,
    timestamp: new Date().toISOString(),
  });
}
