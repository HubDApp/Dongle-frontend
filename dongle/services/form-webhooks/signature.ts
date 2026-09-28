/**
 * HMAC signature helpers for form webhooks
 */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(secret: string, payload: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    return toHex(signature);
  }

  // Fallback for environments without Web Crypto (should be rare in modern Node/browsers)
  const { createHmac } = await import("crypto");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Build the signature header value: sha256=<hex>
 */
export async function signWebhookPayload(secret: string, rawBody: string): Promise<string> {
  const digest = await hmacSha256(secret, rawBody);
  return `sha256=${digest}`;
}

/**
 * Constant-time-ish comparison of two signature strings.
 */
export function safeCompareSignatures(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verify an inbound webhook signature header against the raw body.
 */
export async function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null | undefined,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const expected = await signWebhookPayload(secret, rawBody);
  const provided = signatureHeader.trim();
  return safeCompareSignatures(expected, provided);
}
