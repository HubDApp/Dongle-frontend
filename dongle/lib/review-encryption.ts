/**
 * Review End-to-End Encryption (#731)
 *
 * Provides AES-256-GCM encryption for sensitive review content.
 * The encryption key is deterministically derived from a wallet signature
 * over a stable per-review salt, so only the reviewer (and any party
 * that can produce the same signature) can decrypt.
 *
 * Key derivation:
 *   1. Build a deterministic salt: `dongle:review-key:v1:<publicKey>:<projectId>`
 *   2. Ask Freighter to sign the salt string (Ed25519 via signMessage)
 *   3. SHA-256 hash the raw signature bytes → 256-bit AES-GCM key
 *
 * This means:
 *   - The key is NOT stored anywhere; it is re-derived on demand from the wallet.
 *   - Different wallets produce different keys (public key is in the salt).
 *   - Admins with a "master key" can decrypt by storing a wrapped copy of the
 *     per-review key encrypted to the master key (see ADMIN_WRAPPED_KEY below).
 *
 * Wire format stored in the Review:
 *   encryptedPayload = base64( iv[12] || ciphertext )
 *
 * Note: encrypted reviews are NOT searchable — the plaintext comment is
 * replaced with a sentinel so search indexes never see the real content.
 */

import { signMessage } from "@stellar/freighter-api";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Sentinel stored as `comment` for encrypted reviews so the field is never empty. */
export const ENCRYPTED_COMMENT_SENTINEL = "[encrypted review — connect wallet to decrypt]";

/** Prefix used for the derivation salt. Bump the version to invalidate old keys. */
const SALT_PREFIX = "dongle:review-key:v1";

// ─── Key Derivation ──────────────────────────────────────────────────────────

/**
 * Returns the deterministic salt string that is signed to derive the key.
 * Stable for a given reviewer + project combination.
 */
export function buildKeySalt(publicKey: string, projectId: string): string {
  return `${SALT_PREFIX}:${publicKey}:${projectId}`;
}

/**
 * Derives an AES-256-GCM CryptoKey from a Freighter wallet signature.
 *
 * Asks the wallet to sign the salt string, then SHA-256 hashes the raw
 * signature bytes to produce a 256-bit key material.
 *
 * @throws if Freighter is unavailable or the user rejects the signature.
 */
export async function deriveKeyFromWallet(
  publicKey: string,
  projectId: string,
): Promise<CryptoKey> {
  const salt = buildKeySalt(publicKey, projectId);

  // Request a deterministic Ed25519 signature over the salt.
  // signMessage is available in @stellar/freighter-api ≥ 5.
  const { signature, error } = await signMessage(salt);
  if (error || !signature) {
    throw new Error(error ?? "Wallet signature required to derive encryption key");
  }

  // Decode the base64 signature to raw bytes.
  const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));

  // SHA-256 hash the signature → 256 bits of key material.
  const hashBuffer = await crypto.subtle.digest("SHA-256", sigBytes);

  return crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM", length: 256 },
    false, // not extractable
    ["encrypt", "decrypt"],
  );
}

// ─── Encryption / Decryption ─────────────────────────────────────────────────

/**
 * Encrypts `plaintext` with AES-256-GCM using a random 96-bit IV.
 *
 * @returns base64-encoded `iv[12] || ciphertext`
 */
export async function encryptReview(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  // Prepend IV to ciphertext so it is self-contained.
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64-encoded `iv[12] || ciphertext` blob.
 *
 * @returns decrypted plaintext string
 * @throws if the key is wrong or the ciphertext is corrupt
 */
export async function decryptReview(
  encryptedPayload: string,
  key: CryptoKey,
): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedPayload), (c) =>
    c.charCodeAt(0),
  );

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plainBuffer);
}

// ─── Admin Wrapped Key ───────────────────────────────────────────────────────

/**
 * Wraps the per-review AES key with the admin master public key using
 * RSA-OAEP so admins can decrypt any review without the reviewer's wallet.
 *
 * In production, replace ADMIN_MASTER_PUBLIC_KEY_PEM with the actual key
 * stored in an env variable / KMS.  For now this returns null (feature flag
 * off) so the code path is wired up but not active.
 */
export async function wrapKeyForAdmin(
  _reviewKey: CryptoKey,
): Promise<string | null> {
  // TODO: load NEXT_PUBLIC_ADMIN_MASTER_PUBLIC_KEY from env, import as
  // RSA-OAEP CryptoKey, wrap _reviewKey with it, return base64 result.
  return null;
}
