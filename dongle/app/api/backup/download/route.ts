/**
 * API Route: GET /api/backup/download?walletAddress=G…
 *
 * Returns the stored OPT-IN, client-side-encrypted backup for a wallet so it
 * can be restored on another device. The ciphertext is decrypted only on the
 * client; the server never has access to the plaintext.
 *
 * Responses:
 *   200 → { ok: true, backup: StoredBackup }
 *   400 → invalid or missing wallet address
 *   404 → no backup stored for this wallet yet
 */

import { NextRequest, NextResponse } from "next/server";
import { getStoredBackup, isValidWalletAddress } from "../store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const walletAddress = request.nextUrl.searchParams.get("walletAddress");

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const record = getStoredBackup(walletAddress);

  if (!record) {
    return NextResponse.json({ error: "No backup found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, backup: record }, { status: 200 });
}
