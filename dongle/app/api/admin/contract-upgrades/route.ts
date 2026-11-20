/**
 * GET /api/admin/contract-upgrades
 *
 * Issue #879 – Admin dashboard endpoint that returns the full upgrade history
 * and the latest known WASM hash for each monitored contract.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUpgradeHistory, ContractUpgradeMonitor } from "@/services/stellar/contract-upgrade-monitor.service";
import { DONGLE_CONTRACTS } from "@/constants/contracts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Minimal admin auth: check for internal ADMIN_SECRET header.
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && request.headers.get("x-admin-secret") !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contractId = new URL(request.url).searchParams.get("contractId") ?? undefined;
  const history = getUpgradeHistory(contractId);

  const monitor = ContractUpgradeMonitor.getInstance();
  const knownHashes = [
    DONGLE_CONTRACTS.PROJECT_REGISTRY,
    DONGLE_CONTRACTS.REVIEW_REGISTRY,
    DONGLE_CONTRACTS.VERIFICATION_REGISTRY,
  ]
    .filter(Boolean)
    .map((id) => ({
      contractId: id,
      currentHash: monitor.getKnownHash(id) ?? null,
    }));

  return NextResponse.json({
    success: true,
    upgradeCount: history.length,
    history,
    knownHashes,
    fetchedAt: new Date().toISOString(),
  });
}
