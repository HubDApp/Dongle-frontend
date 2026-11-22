/**
 * GET /api/cron/contract-upgrade-check
 *
 * Issue #879 – Notify When Smart Contracts Are Upgraded.
 *
 * Schedule this route to run once per hour (e.g. via Vercel Cron or an
 * external cron service).  It checks WASM hashes for all registered contracts
 * and notifies connected SSE clients on any change.
 *
 * vercel.json example:
 *   { "crons": [{ "path": "/api/cron/contract-upgrade-check", "schedule": "0 * * * *" }] }
 */

import { NextRequest, NextResponse } from "next/server";
import { ContractUpgradeMonitor } from "@/services/stellar/contract-upgrade-monitor.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Protect with a cron secret so only the scheduler can trigger it.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const monitor = ContractUpgradeMonitor.getInstance();
  const upgrades = await monitor.check();

  return NextResponse.json({
    success: true,
    upgradesDetected: upgrades.length,
    upgrades,
    checkedAt: new Date().toISOString(),
  });
}
