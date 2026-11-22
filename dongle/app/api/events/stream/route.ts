/**
 * GET /api/events/stream
 *
 * Issue #877 – Real-Time Monitoring of Smart Contract Events.
 *
 * Server-Sent Events (SSE) stream.  The browser connects with:
 *   new EventSource('/api/events/stream?userAddress=G...')
 *
 * Query params:
 *   userAddress  – optional Stellar address; only relevant events are pushed
 *   fromLedger   – optional starting ledger sequence number
 */

import { type NextRequest } from "next/server";
import { ContractEventListener } from "@/services/stellar/contract-event-listener.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get("userAddress") ?? undefined;
  const fromLedger = searchParams.get("fromLedger")
    ? Number(searchParams.get("fromLedger"))
    : undefined;

  const contractId =
    process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT ??
    process.env.SOROBAN_CONTRACT_ID ??
    "";

  if (!contractId) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Contract ID not configured" })}\n\n`,
      {
        status: 503,
        headers: { "Content-Type": "text/event-stream" },
      },
    );
  }

  const listener = new ContractEventListener({
    contractId,
    userAddress,
    fromLedger,
    pollIntervalMs: 5_000,
  });

  return listener.streamResponse(request.signal);
}
