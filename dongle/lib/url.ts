/**
 * Normalizes and validates a URL string.
 * Supports protocols: http, https. Rejects unsafe protocols (javascript:, data:).
 * Automatically prepends https:// if no protocol is present.
 */
export function normalizeUrl(urlStr: string): string {
  let cleaned = urlStr.trim();
  if (!cleaned) {
    throw new Error("URL cannot be empty");
  }

  // Prepend https:// if no protocol is present
  if (!/^https?:\/\//i.test(cleaned)) {
    if (!/^[a-z0-9+-.]+:/i.test(cleaned)) {
      cleaned = "https://" + cleaned;
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch (e) {
    throw new Error("Invalid URL structure");
  }

  // Reject unsupported / unsafe protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Protocol "${parsed.protocol}" is not supported. Only http and https are allowed.`);
  }

  const hostname = parsed.hostname;
  if (!hostname.includes(".") && hostname !== "localhost") {
    throw new Error("Invalid URL structure");
  }

  // Standardize domain and strip standard port
  let normalized = parsed.origin + parsed.pathname;
  if (normalized.endsWith("/") && parsed.pathname === "/") {
    normalized = normalized.slice(0, -1);
  }

  if (parsed.search) {
    normalized += parsed.search;
  }
  if (parsed.hash) {
    normalized += parsed.hash;
  }

  return normalized;
}

/**
 * Extracts normalized domain name from a URL string for duplicate detection and safety checks.
 */
export function extractDomain(urlStr: string): string {
  try {
    const normalized = normalizeUrl(urlStr);
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./i, "");
  } catch (e) {
    return "";
  }
}
