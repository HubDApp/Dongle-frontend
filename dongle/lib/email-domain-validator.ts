/**
 * Email Domain Validator (Issue #504)
 *
 * Validates whether an email's domain has active MX (Mail Exchange) DNS records,
 * confirming the domain can receive incoming email before submission.
 *
 * Features:
 * - Checks MX records exist for the domain
 * - Uses DNS lookup (Node.js dns/promises with fallback to DNS-over-HTTPS)
 * - In-memory LRU/TTL caching for fast repeated lookups
 * - Handles DNS failures, timeouts, NXDOMAIN, and malformed inputs gracefully
 * - Fully configurable timeout, TTL, and custom DNS resolver injection
 */

export interface MxRecord {
  exchange: string;
  priority: number;
}

export interface EmailDomainValidationResult {
  valid: boolean;
  domain: string;
  mxRecords: MxRecord[];
  cached: boolean;
  error?: string;
}

export interface EmailDomainValidatorOptions {
  /** Cache time-to-live in milliseconds. Default: 600,000 (10 minutes). */
  cacheTtlMs?: number;
  /** DNS query timeout in milliseconds. Default: 5,000 (5 seconds). */
  timeoutMs?: number;
  /** Skip cache check and force fresh lookup. Default: false. */
  bypassCache?: boolean;
  /** Custom DNS resolver function for testing or specialized environments. */
  resolver?: (domain: string) => Promise<MxRecord[]>;
}

interface CacheEntry {
  result: EmailDomainValidationResult;
  expiresAt: number;
}

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_TIMEOUT_MS = 5000; // 5 seconds
const MAX_CACHE_ENTRIES = 1000;

// In-memory cache
const mxCache = new Map<string, CacheEntry>();
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Extracts and normalizes the domain from an email address or raw domain string.
 */
export function extractDomainFromEmail(emailOrDomain: string): string {
  if (typeof emailOrDomain !== "string") return "";
  const trimmed = emailOrDomain.trim().toLowerCase();
  if (!trimmed) return "";

  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex !== -1) {
    return trimmed.slice(atIndex + 1).trim();
  }
  return trimmed;
}

/**
 * Validates domain string syntax according to RFC requirements.
 */
export function isValidDomainFormat(domain: string): boolean {
  if (!domain || typeof domain !== "string") return false;
  const clean = domain.trim();
  if (clean.length < 3 || clean.length > 253) return false;

  // Domain cannot start or end with a dot or hyphen
  if (clean.startsWith(".") || clean.endsWith(".") || clean.startsWith("-") || clean.endsWith("-")) {
    return false;
  }

  // Domain must contain at least one dot separating labels
  const labels = clean.split(".");
  if (labels.length < 2) return false;

  const labelRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  for (const label of labels) {
    if (!label || label.length > 63 || !labelRegex.test(label)) {
      return false;
    }
  }

  // TLD must be at least 2 characters and cannot be entirely numeric
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || /^\d+$/.test(tld)) {
    return false;
  }

  return true;
}

/**
 * Resolve MX records using Node.js `dns/promises` if available.
 */
async function resolveMxNode(domain: string): Promise<MxRecord[]> {
  try {
    const dns = await import("node:dns/promises");
    const records = await dns.resolveMx(domain);
    return records.map((r) => ({
      exchange: r.exchange,
      priority: r.priority,
    }));
  } catch (err: any) {
    // If domain has no MX records or doesn't exist, return empty or rethrow
    if (err?.code === "ENODATA" || err?.code === "ENOTFOUND" || err?.code === "ESERVFAIL") {
      return [];
    }
    throw err;
  }
}

/**
 * Resolve MX records via DNS-over-HTTPS (DoH) API (Cloudflare or Google DNS).
 * Used when running in browser or edge environments where raw DNS is unavailable.
 */
async function resolveMxDoH(domain: string, timeoutMs: number): Promise<MxRecord[]> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/dns-json" },
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(`DoH server responded with HTTP status ${response.status}`);
    }

    const data: { Status?: number; Answer?: Array<{ type: number; data: string }> } = await response.json();
    if (!data.Answer || data.Answer.length === 0) {
      return [];
    }

    const records: MxRecord[] = [];
    for (const ans of data.Answer) {
      // Type 15 is MX
      if (ans.type === 15 && ans.data) {
        const parts = ans.data.trim().split(/\s+/);
        if (parts.length >= 2) {
          const priority = parseInt(parts[0], 10);
          const exchange = parts[1].replace(/\.$/, "");
          records.push({ priority: isNaN(priority) ? 10 : priority, exchange });
        }
      }
    }
    return records;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Query DNS for domain MX records with timeout and fallback.
 */
export async function checkMxRecords(
  domain: string,
  options: EmailDomainValidatorOptions = {}
): Promise<MxRecord[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (options.resolver) {
    return await options.resolver(domain);
  }

  // Attempt Node.js resolver if in server environment
  const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

  const lookupPromise = (async () => {
    if (isNode) {
      try {
        return await resolveMxNode(domain);
      } catch {
        // Fall back to DoH if native lookup fails
        return await resolveMxDoH(domain, timeoutMs);
      }
    } else {
      return await resolveMxDoH(domain, timeoutMs);
    }
  })();

  // Timeout guard
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`DNS MX lookup timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return await Promise.race([lookupPromise, timeoutPromise]);
}

/**
 * Validates an email domain's MX records.
 *
 * @param emailOrDomain Full email address or domain name
 * @param options Lookup and caching configuration
 * @returns Result object with validity, domain, MX records, and cache status
 */
export async function validateEmailDomain(
  emailOrDomain: string,
  options: EmailDomainValidatorOptions = {}
): Promise<EmailDomainValidationResult> {
  const domain = extractDomainFromEmail(emailOrDomain);

  if (!domain || !isValidDomainFormat(domain)) {
    return {
      valid: false,
      domain: domain || "",
      mxRecords: [],
      cached: false,
      error: "Invalid email domain format",
    };
  }

  const ttl = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const now = Date.now();

  // Check cache unless explicitly bypassed
  if (!options.bypassCache) {
    const cachedEntry = mxCache.get(domain);
    if (cachedEntry) {
      if (now < cachedEntry.expiresAt) {
        cacheHits++;
        return {
          ...cachedEntry.result,
          cached: true,
        };
      }
      mxCache.delete(domain);
    }
  }

  cacheMisses++;

  try {
    const mxRecords = await checkMxRecords(domain, options);

    const valid = mxRecords.length > 0;
    const result: EmailDomainValidationResult = {
      valid,
      domain,
      mxRecords,
      cached: false,
      error: valid ? undefined : "No active MX records found for domain",
    };

    // Store in cache (evict oldest entry if size limit reached)
    if (mxCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = mxCache.keys().next().value;
      if (firstKey) mxCache.delete(firstKey);
    }
    mxCache.set(domain, { result, expiresAt: now + ttl });

    return result;
  } catch (err: any) {
    // Graceful error handling - never crash the application on DNS failure
    const errorMessage = err instanceof Error ? err.message : String(err);
    const result: EmailDomainValidationResult = {
      valid: false,
      domain,
      mxRecords: [],
      cached: false,
      error: `DNS lookup failed: ${errorMessage}`,
    };

    // Cache negative failure with shorter TTL (1 minute) to avoid spamming broken endpoints
    mxCache.set(domain, { result, expiresAt: now + Math.min(ttl, 60_000) });

    return result;
  }
}

/**
 * Clears the in-memory MX lookup cache and resets hit/miss counters.
 */
export function clearMxCache(): void {
  mxCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Returns cache diagnostics (size, hits, misses).
 */
export function getMxCacheStats(): { size: number; hits: number; misses: number } {
  return {
    size: mxCache.size,
    hits: cacheHits,
    misses: cacheMisses,
  };
}
