/**
 * Submission Signing Service
 *
 * Cryptographically signs form submissions using the user's Stellar wallet
 * (Freighter) before they are sent to the server.  The server can then verify
 * the signature to ensure tamper-proof data integrity.
 *
 * Acceptance criteria covered:
 * - Submissions signed with private key (via Freighter signMessage)
 * - Signature verified server-side
 * - Tamper detection (any change invalidates the signature)
 * - Audit trail (signature / publicKey stored with the submission)
 * - Signature included in confirmation (returned in API response)
 */

import { signMessage } from "@stellar/freighter-api";
import { generateId } from "@/lib/id-generator";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SignedPayload {
  /** Deterministic JSON string of the form data (sorted keys) + nonce + timestamp. */
  payload: string;
  /** Base64-encoded Ed25519 signature produced by Freighter. */
  signature: string;
  /** Stellar public key of the signer (G… address). */
  publicKey: string;
  /** ISO-8601 timestamp of when the signature was created. */
  timestamp: string;
  /** Unique nonce to prevent replay attacks. */
  nonce: string;
}

export interface SignedSubmission<T extends Record<string, unknown>> {
  signedPayload: SignedPayload;
  data: T;
  /** ID generated client-side for audit trail continuity. */
  submissionId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Serialise an object to a deterministic JSON string with sorted keys.
 * This ensures that the same data always produces the same string, regardless
 * of key ordering in the object literal.
 */
export function deterministicStringify(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const ordered: Record<string, unknown> = {};
  for (const key of keys) {
    ordered[key] = obj[key];
  }
  return JSON.stringify(ordered);
}

// ─── Service ─────────────────────────────────────────────────────────────────

async function signPayload(
  data: Record<string, unknown>,
  publicKey: string,
): Promise<SignedPayload> {
  const nonce = generateId();
  const timestamp = new Date().toISOString();

  // Build a deterministic payload: sorted keys so server gets the same string.
  const payload = deterministicStringify({ ...data, nonce, timestamp, publicKey });

  // Ask Freighter to sign the payload string using the user's Stellar keypair.
  // The signMessage function was added in Freighter v5 / @stellar/freighter-api v5.
  const { signature } = await signMessage(payload);

  return { payload, signature, publicKey, timestamp, nonce };
}

/**
 * Wraps form data together with a cryptographic signature, ready for
 * transmission to the server.
 */
async function sign<T extends Record<string, unknown>>(
  data: T,
  publicKey: string,
): Promise<SignedSubmission<T>> {
  const signedPayload = await signPayload(data as Record<string, unknown>, publicKey);
  return {
    signedPayload,
    data,
    submissionId: generateId(),
  };
}

export const submissionSigningService = {
  signPayload,
  sign,
  deterministicStringify,
};