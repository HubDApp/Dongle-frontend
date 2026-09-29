import DOMPurifyModule from "isomorphic-dompurify";
const DOMPurify = (DOMPurifyModule as any).default || DOMPurifyModule;

/**
 * Interface representing the result of a detailed URL validation.
 */
export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  domain?: string;
  error?: string;
}

/**
 * HTML entity encodes characters to safely render strings in HTML attributes or text.
 * Escapes &, <, >, ", ', and `
 */
export function encodeUrlForHtml(urlStr: string): string {
  if (!urlStr || typeof urlStr !== "string") return "";
  return urlStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/`/g, "&#x60;");
}

/**
 * Decodes basic HTML entities and removes hidden control/whitespace characters
 * to prevent protocol obfuscation bypasses (e.g. java\0script:, javascript&#x3A;).
 */
export function decodeAndSanitizeRawString(input: string): string {
  if (!input || typeof input !== "string") return "";
  // Strip control characters, null bytes, tabs, and line breaks
  let cleaned = input.replace(/[\x00-\x1F\x7F-\x9F\r\n\t]/g, "").trim();

  // Decode common HTML entities that might hide dangerous schemes (e.g. &#x3a; -> :)
  cleaned = cleaned
    .replace(/&#x3a;/gi, ":")
    .replace(/&#58;/g, ":")
    .replace(/&colon;/gi, ":");

  // DOMPurify sanitization to remove any embedded HTML tags/scripts/event handlers
  cleaned = DOMPurify.sanitize(cleaned, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

  return cleaned.trim();
}

/**
 * Removes trailing slashes from a URL string, path, or domain.
 * If the path is only "/", it strips the trailing slash.
 */
export function removeTrailingSlash(urlStr: string): string {
  if (!urlStr || typeof urlStr !== "string") return "";
  const trimmed = urlStr.trim();
  // Don't strip if it's just "http://" or "https://"
  if (/^https?:\/\/$/i.test(trimmed)) return trimmed;
  return trimmed.replace(/\/+$/, "");
}

/**
 * Ensures a URL string has an explicit protocol (defaulting to https://).
 * If no scheme is present, prepends the given protocol.
 */
export function addProtocolIfMissing(urlStr: string, defaultProtocol = "https://"): string {
  if (!urlStr || typeof urlStr !== "string") return "";
  const trimmed = urlStr.trim();
  if (/^[a-z0-9+-.]+:\/\//i.test(trimmed) || /^[a-z0-9+-.]+:$/i.test(trimmed) || /^[a-z0-9+-.]+:[^/]/i.test(trimmed)) {
    return trimmed;
  }
  const cleanProtocol = defaultProtocol.endsWith("://") ? defaultProtocol : `${defaultProtocol}://`;
  return `${cleanProtocol}${trimmed}`;
}

/**
 * Normalizes, sanitizes with DOMPurify, and validates a URL string.
 * Supports protocols: http, https. Rejects unsafe protocols (javascript:, data:, vbscript:, file:, etc.).
 * Automatically prepends https:// if no protocol is present and removes trailing slashes on standard root paths.
 */
export function normalizeUrl(urlStr: string): string {
  if (!urlStr || typeof urlStr !== "string") {
    throw new Error("URL cannot be empty");
  }

  const rawCleaned = decodeAndSanitizeRawString(urlStr);
  if (!rawCleaned) {
    throw new Error("URL cannot be empty");
  }

  // Prepend https:// if no protocol is present
  let cleaned = rawCleaned;
  if (!/^https?:\/\//i.test(cleaned)) {
    // If it starts with an explicit scheme (e.g. javascript:, data:, ftp:, file:)
    if (/^[a-z0-9+-.]+:/i.test(cleaned)) {
      // Unsafe or non-http/https protocol
      const schemeMatch = cleaned.match(/^([a-z0-9+-.]+):/i);
      const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : "";
      if (scheme !== "http" && scheme !== "https") {
        throw new Error(`Protocol "${scheme}:" is not supported. Only http and https are allowed.`);
      }
    } else {
      cleaned = "https://" + cleaned;
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("Invalid URL structure");
  }

  // Reject unsupported / unsafe protocols (e.g., javascript:, data:, vbscript:, file:, blob:)
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    throw new Error(`Protocol "${parsed.protocol}" is not supported. Only http and https are allowed.`);
  }

  const hostname = parsed.hostname;
  if (!hostname || (!hostname.includes(".") && hostname !== "localhost")) {
    throw new Error("Invalid URL structure");
  }

  // Standardize domain and strip standard root path slash
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
  } catch {
    return "";
  }
}
