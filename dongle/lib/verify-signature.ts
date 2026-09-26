/**
 * Signature Verification Utility (server-side)
 *
 * Verifies a Ed25519 signature produced by Freighter's `signMessage` API.
 * The signed payload is SHA-256 hashed and checked against the Stellar
 * public key of the signer.
 *
 * Usage in API routes:
 *   import { verifySignature } from "@/lib/verify-signature";
 *
 *   const valid = verifySignature(payload, signature, publicKey);
 *   if (!valid) { return new Response("Invalid signature", { status: 401 }); }
 */

import { Keypair } from "stellar-sdk";
import { createHash } from "crypto";

/**
 * Verifies that `signature` is a valid Ed25519 signature over `payload`
 * produced by the holder of `publicKey`.
 *
 * @param payload   - The exact deterministic JSON string that was signed.
 * @param signature - Base64-encoded signature bytes (64 bytes).
 * @param publicKey - Stellar G… address of the claimed signer.
 * @returns `true` when the signature is valid, `false` otherwise.
 */
export function verifySignature(
  payload: string,
  signature: string,
  publicKey: string,
): boolean {
  try {
    const keypair = Keypair.fromPublicKey(publicKey);

    // SHA-256 hash of the payload (same as Freighter's signMessage does
    // before Ed25519 signing).
    const hash = createHash("sha256").update(payload, "utf-8").digest();

    // Decode the base64 signature to raw 64-byte Buffer.
    const sigBytes = Buffer.from(signature, "base64");

    return keypair.verify(hash, sigBytes);
  } catch {
    // Any error (invalid key format, bad base64, etc.) → verification fails.
    return false;
  }
}