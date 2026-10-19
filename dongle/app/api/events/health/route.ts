import { NextResponse } from "next/server";
import { redisAvailable } from "@/lib/redis";
import {
  getLedgerCheckpoint,
  getListenerHeartbeat,
  sorobanQueueDepth,
} from "@/services/indexer/event-queue.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const rpcUrl = process.env.SOROBAN_RPC_URL ?? process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
  const contractId = process.env.SOROBAN_CONTRACT_ID ?? process.env.NEXT_PUBLIC_SOROBAN_CONTRACT_ID;
  const checkpoint = contractId ? await getLedgerCheckpoint(contractId) : 0;
  const heartbeat = contractId ? await getListenerHeartbeat(contractId) : 0;
  const queueDepth = await sorobanQueueDepth();
  let latestLedger: number | null = null;

  if (rpcUrl && contractId) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestLedger", params: {} }),
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (response.ok) {
        const body = await response.json() as { result?: { sequence?: number } };
        latestLedger = body.result?.sequence ?? null;
      }
    } catch {
      latestLedger = null;
    }
  }

  const workerActive = heartbeat > 0 && Date.now() - heartbeat < 30_000;
  const healthy = Boolean(rpcUrl && contractId && redisAvailable && latestLedger !== null && workerActive);
  return NextResponse.json({
    status: healthy ? "healthy" : "degraded",
    redisConfigured: redisAvailable,
    listenerConfigured: Boolean(rpcUrl && contractId),
    workerActive,
    checkpoint,
    latestLedger,
    lagLedgers: latestLedger === null ? null : Math.max(0, latestLedger - checkpoint),
    queueDepth,
    checkedAt: new Date().toISOString(),
  }, { status: healthy ? 200 : 503 });
}