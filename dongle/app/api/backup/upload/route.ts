/**
 * API Route: POST /api/backup/upload
 *
 * Stores an OPT-IN, client-side-encrypted backup for a wallet so the same data
 * can be restored on another device.
 *
 * The body's `ciphertext` is produced on the client with AES (`ENC_V1:` payload
 * from `lib/crypto-storage.ts`), keyed by the user's Stellar public key.
 * The server stores the opaque blob only and can never read the plaintext —
 * reviews, drafts, bookmarks and settings remain invisible to admins.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  putStoredBackup,
  isValidWalletAddress,
  isEncryptedPayload,
  MAX_BACKUP_BYTES,
  type StoredBackup,
} from "../store";
import { publishRevision } from "../../sync/store";

export const dynamic = "force-dynamic";

interface UploadBody {
  walletAddress?: unknown;
  ciphertext?: unknown;
  version?: unknown;
  deviceId?: unknown;
  createdAt?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: UploadBody;
  try {
    body = (await request.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { walletAddress, ciphertext, version, deviceId, createdAt } = body;

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // The payload must be client-side encrypted — never accept plaintext.
  if (!isEncryptedPayload(ciphertext)) {
    return NextResponse.json(
      { error: "Backup payload must be client-side encrypted" },
      { status: 400 },
    );
  }

  // Guard the in-memory store against oversized payloads.
  if (ciphertext.length > MAX_BACKUP_BYTES) {
    return NextResponse.json(
      { error: "Backup payload exceeds the 5 MB limit" },
      { status: 413 },
    );
  }

  const now = new Date().toISOString();

  const record: StoredBackup = {
    walletAddress,
    version: Number.isInteger(version) ? (version as number) : 1,
    ciphertext,
    deviceId:
      typeof deviceId === "string" && deviceId.length > 0
        ? deviceId.slice(0, 128)
        : "unknown",
    createdAt:
      typeof createdAt === "string" && createdAt.length > 0 ? createdAt : now,
    updatedAt: now,
    size: ciphertext.length,
  };

  putStoredBackup(record);

  // Notify the wallet's other devices (via the sync SSE stream) that a new
  // revision is available so they pull and reconcile in real time.
  const syncEvent = publishRevision(
    record.walletAddress,
    record.deviceId,
    record.createdAt,
    record.size,
  );

  // Never echo the ciphertext back to the client.
  return NextResponse.json(
    {
      ok: true,
      walletAddress: record.walletAddress,
      version: record.version,
      deviceId: record.deviceId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      size: record.size,
      revision: syncEvent.revision,
    },
    { status: 200 },
  );
}

export async function GET(): Promise<NextResponse> {
  // Metadata about the upload contract (no user data involved).
  const existing = "Method not allowed; use POST to upload backups.";
  return NextResponse.json({ error: existing }, { status: 405 });
}
