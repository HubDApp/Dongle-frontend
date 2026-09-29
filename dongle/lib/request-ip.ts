/**
 * Server-side client IP extraction.
 *
 * A browser cannot read its own public IP address, so the audit log records it
 * where the request is actually handled — inside a Next.js route handler. The
 * header precedence matches the existing anomaly-detection IP hash endpoint so
 * both features agree on the same client identity.
 */

import type { ClientIpContext } from "@/types/form-audit-log";

/** Minimal request shape needed to resolve a client IP (NextRequest compatible). */
export interface ClientRequestLike {
  headers: { get(name: string): string | null };
  /** Populated by some Next.js runtimes; used only as a last resort. */
  ip?: string;
}

/**
 * Resolve the originating client IP from proxy headers.
 * `x-forwarded-for` may contain a chain — the first entry is the client.
 */
export function extractClientIP(request: ClientRequestLike): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP.trim();

  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP.trim();

  return request.ip || "unknown";
}

/** Deterministic, non-reversible hash of an IP address (FNV-style, 8 hex chars). */
export function hashClientIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `ip_${Math.abs(hash).toString(16).substring(0, 8)}`;
}

/**
 * Build the IP stamp stored on audit entries.
 * Returns `unavailable` (nulls) when no usable address is present, so callers
 * never persist the literal "unknown" as if it were an IP.
 */
export function clientIpContext(request: ClientRequestLike): ClientIpContext {
  const ip = extractClientIP(request);
  if (!ip || ip === "unknown") {
    return { ipAddress: null, ipHash: null, ipSource: "unavailable" };
  }
  return { ipAddress: ip, ipHash: hashClientIP(ip), ipSource: "server" };
}
