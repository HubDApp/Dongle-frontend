/**
 * POST /api/transactions/estimate-fee
 *
 * Issue #878 – Preview Transaction Costs Before Signing.
 *
 * Accepts an unsigned transaction XDR, runs `simulateTransaction` against the
 * Soroban RPC, and returns a structured fee breakdown with USD conversion.
 */

import { NextRequest, NextResponse } from "next/server";
import { estimateTransactionFee } from "@/services/stellar/transaction-fee.service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { transactionXdr?: string; rpcUrl?: string };
  try {
    body = (await request.json()) as { transactionXdr?: string; rpcUrl?: string };
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  if (!body.transactionXdr) {
    return NextResponse.json(
      { error: "transactionXdr is required" },
      { status: 400 },
    );
  }

  const result = await estimateTransactionFee(body.transactionXdr, body.rpcUrl);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ success: true, fee: result.fee });
}
