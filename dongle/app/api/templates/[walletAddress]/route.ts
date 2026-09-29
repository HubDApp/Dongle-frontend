/**
 * API Route: /api/templates/[walletAddress]
 *
 * Lists all form templates stored for a wallet (in-memory DB stand-in).
 *
 * GET — retrieve all templates for the wallet
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getWalletTemplates,
  isValidWalletAddress,
} from "@/services/form-template/template-store";

interface RouteParams {
  walletAddress: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  const { walletAddress } = await params;

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const templates = Array.from(getWalletTemplates(walletAddress).values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  return NextResponse.json(templates);
}
