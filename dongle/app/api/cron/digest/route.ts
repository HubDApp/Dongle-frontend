/**
 * GET /api/cron/digest
 *
 * Scheduled cron handler — runs every hour and sends digest emails to any
 * subscriber whose local 9 AM window falls within the current hour.
 *
 * Schedule: "0 * * * *" (every hour on the hour) — the service checks each
 * subscriber's timezone independently and sends only when their local time
 * is 9 AM and they haven't already received a digest today/this week.
 *
 * Authentication: CRON_SECRET bearer token (matches analytics cron pattern).
 */

import { NextResponse } from "next/server";
import { runDigestBatch } from "@/lib/digest/digest.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Require CRON_SECRET when set (prevents unauthorised manual triggers in prod)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runDigestBatch();
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      durationMs: result.durationMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[cron/digest] Fatal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
