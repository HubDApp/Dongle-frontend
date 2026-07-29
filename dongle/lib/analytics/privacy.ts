/**
 * Privacy helpers for analytics payloads.
 * Never emit full wallet addresses, review text, or free-form PII.
 */

const WALLET_ADDRESS_RE = /\bG[A-Z2-7]{55}\b/g;
const CONTRACT_ID_RE = /\bC[A-Z2-7]{55}\b/g;

/** Keys whose values must never leave the device in analytics payloads. */
const BLOCKED_PROPERTY_KEYS = new Set([
  "publickey",
  "public_key",
  "wallet",
  "walletaddress",
  "wallet_address",
  "address",
  "useraddress",
  "user_address",
  "comment",
  "review",
  "reviewtext",
  "review_text",
  "explanation",
  "description",
  "email",
  "name",
  "query",
  "search",
  "searchquery",
  "search_query",
  "q",
]);

/**
 * Derive a short, non-reversible wallet fingerprint for funnel joining.
 * Uses FNV-1a over the full address and returns an 8-hex digest — never the
 * original G... key.
 */
export function anonymizeWalletAddress(address: string | null | undefined): string | null {
  if (!address || typeof address !== "string") return null;
  const trimmed = address.trim();
  if (!trimmed.startsWith("G") || trimmed.length < 56) return null;

  // FNV-1a 32-bit — deterministic, no crypto dependency, not invertible to G...
  let hash = 0x811c9dc5;
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Strip wallet / contract ids from free-form strings that might leak into props.
 */
export function redactSensitiveText(value: string): string {
  return value
    .replace(WALLET_ADDRESS_RE, "[wallet]")
    .replace(CONTRACT_ID_RE, "[contract]");
}

/**
 * Sanitize an analytics property bag:
 * - drops blocked keys (addresses, review bodies, raw search text, etc.)
 * - redacts G... / C... ids found inside string values
 * - coerces unsupported types away
 */
export function sanitizeProperties(
  properties: Record<string, unknown> | undefined | null,
): Record<string, string | number | boolean | null> {
  if (!properties) return {};

  const out: Record<string, string | number | boolean | null> = {};

  for (const [rawKey, rawValue] of Object.entries(properties)) {
    const key = rawKey.trim();
    if (!key) continue;

    if (BLOCKED_PROPERTY_KEYS.has(key.toLowerCase().replace(/[^a-z0-9_]/g, ""))) {
      continue;
    }

    if (rawValue === undefined) continue;
    if (rawValue === null) {
      out[key] = null;
      continue;
    }

    if (typeof rawValue === "boolean" || typeof rawValue === "number") {
      if (typeof rawValue === "number" && !Number.isFinite(rawValue)) continue;
      out[key] = rawValue;
      continue;
    }

    if (typeof rawValue === "string") {
      // Reject values that look like full Stellar addresses even under safe keys
      if (
        (rawValue.startsWith("G") || rawValue.startsWith("C")) &&
        rawValue.length === 56 &&
        /^[A-Z2-7]+$/.test(rawValue)
      ) {
        continue;
      }
      out[key] = redactSensitiveText(rawValue);
      continue;
    }
  }

  return out;
}

/** Bucket a search query length so we can measure engagement without storing the query. */
export function bucketQueryLength(length: number): string {
  if (length <= 0) return "0";
  if (length <= 2) return "1-2";
  if (length <= 5) return "3-5";
  if (length <= 10) return "6-10";
  if (length <= 20) return "11-20";
  return "21+";
}
