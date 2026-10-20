/**
 * Webhook signature generation and verification utilities
 * Implements HMAC-SHA256 signing for webhook security
 */

import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_VERSION = "v1";
const SIGNATURE_HEADER = "X-Webhook-Signature";
const TIMESTAMP_HEADER = "X-Webhook-Timestamp";
const REPLAY_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export interface SignatureComponents {
  signature: string;
  timestamp: string;
  version: string;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateSignature(
  payload: string,
  secret: string,
  timestamp: string = new Date().toISOString()
): SignatureComponents {
  const signedPayload = `${SIGNATURE_VERSION}.${timestamp}.${payload}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(signedPayload);
  const signature = hmac.digest("hex");

  return {
    signature: `${SIGNATURE_VERSION}=${signature}`,
    timestamp,
    version: SIGNATURE_VERSION,
  };
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string,
  options: {
    replayTolerance?: number;
    skipTimestampCheck?: boolean;
  } = {}
): { valid: boolean; error?: string } {
  // Check timestamp to prevent replay attacks
  if (!options.skipTimestampCheck) {
    const timestampMs = new Date(timestamp).getTime();
    const now = Date.now();
    const tolerance = options.replayTolerance ?? REPLAY_TOLERANCE_MS;

    if (Math.abs(now - timestampMs) > tolerance) {
      return {
        valid: false,
        error: "Timestamp outside tolerance window (possible replay attack)",
      };
    }
  }

  // Parse signature
  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== SIGNATURE_VERSION) {
    return { valid: false, error: "Invalid signature format" };
  }

  const providedSignature = parts[1];

  // Generate expected signature
  const expected = generateSignature(payload, secret, timestamp);
  const expectedSignature = expected.signature.split("=")[1];

  // Timing-safe comparison
  try {
    const providedBuffer = Buffer.from(providedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (providedBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: "Signature length mismatch" };
    }

    const isValid = timingSafeEqual(providedBuffer, expectedBuffer);
    return { valid: isValid, error: isValid ? undefined : "Signature mismatch" };
  } catch (error) {
    return { valid: false, error: "Signature verification failed" };
  }
}

/**
 * Create signature headers for HTTP request
 */
export function createSignatureHeaders(
  payload: unknown,
  secret: string
): Record<string, string> {
  const payloadString = JSON.stringify(payload);
  const { signature, timestamp } = generateSignature(payloadString, secret);

  return {
    [SIGNATURE_HEADER]: signature,
    [TIMESTAMP_HEADER]: timestamp,
    "Content-Type": "application/json",
  };
}

/**
 * Verify signature from HTTP headers
 */
export function verifySignatureFromHeaders(
  payload: string,
  headers: Record<string, string | undefined>,
  secret: string,
  options?: { replayTolerance?: number; skipTimestampCheck?: boolean }
): { valid: boolean; error?: string } {
  const signature = headers[SIGNATURE_HEADER] || headers[SIGNATURE_HEADER.toLowerCase()];
  const timestamp = headers[TIMESTAMP_HEADER] || headers[TIMESTAMP_HEADER.toLowerCase()];

  if (!signature || !timestamp) {
    return { valid: false, error: "Missing signature or timestamp headers" };
  }

  return verifySignature(payload, signature, timestamp, secret, options);
}

export { SIGNATURE_HEADER, TIMESTAMP_HEADER, REPLAY_TOLERANCE_MS };
