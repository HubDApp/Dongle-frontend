/**
 * Server-side store for client-encrypted cloud backups.
 *
 * Privacy model:
 *   The payload written here is *already encrypted on the client* (AES, tagged
 *   with the `ENC_V1:` prefix — see `lib/crypto-storage.ts`). The server only
 *   ever persists an opaque ciphertext blob and can never read its contents,
 *   so a user's reviews, drafts and bookmarks are not visible to admins.
 *
 * Persistence is intentionally in-memory (mirroring `app/api/drafts/...`) so
 * the feature works without a database. Swap the Map for a real KV/DB store in
 * production without changing the route contracts.
 */

/** Maximum accepted ciphertext size (bytes) — protects the store from abuse. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024; // 5 MB

/** Prefix that marks a value as client-side encrypted. */
export const ENCRYPTED_PREFIX = "ENC_V1:";

export interface StoredBackup {
  walletAddress: string;
  /** Backup schema version chosen by the client. */
  version: number;
  /** Opaque, client-encrypted payload (`ENC_V1:`…). */
  ciphertext: string;
  /** Identifier of the device that produced the snapshot. */
  deviceId: string;
  /** When the client captured the snapshot (ISO timestamp). */
  createdAt: string;
  /** When the server last received a snapshot (ISO timestamp). */
  updatedAt: string;
  /** Ciphertext length in characters. */
  size: number;
}

// Map<walletAddress, StoredBackup>
const backups = new Map<string, StoredBackup>();

/** Read the stored backup for a wallet, if any. */
export function getStoredBackup(walletAddress: string): StoredBackup | undefined {
  return backups.get(walletAddress);
}

/** Insert or replace the stored backup for a wallet. */
export function putStoredBackup(record: StoredBackup): void {
  backups.set(record.walletAddress, record);
}

/** Remove the stored backup for a wallet. Returns true when one existed. */
export function removeStoredBackup(walletAddress: string): boolean {
  return backups.delete(walletAddress);
}

/** Validate that a value looks like a Stellar public key (G…). */
export function isValidWalletAddress(value: unknown): value is string {
  return typeof value === "string" && /^G[A-Z2-7]{55}$/.test(value);
}

/** Validate that a value is a client-encrypted payload. */
export function isEncryptedPayload(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}
