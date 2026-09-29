import { NextResponse } from "next/server";
import { refreshAnalyticsCache } from "@/lib/analytics-dashboard/query";

export const dynamic = "force-dynamic";

/**
 * Scheduled at 00:00 UTC via vercel.json crons.
 * Also callable locally: `curl -H "Authorization: Bearer $CRON_SECRET" ...`
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const cache = await refreshAnalyticsCache();
    return NextResponse.json({
      ok: true,
      generatedAt: cache.generatedAt,
      source: cache.source,
      rpcError: cache.rpcError ?? null,
    });
  } catch (error) {
    console.error("[cron/analytics] failed", error);
    return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
  }
}
