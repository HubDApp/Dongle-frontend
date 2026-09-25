/**
 * IP Hash API Endpoint
 * Returns a hashed representation of the client IP for anomaly detection
 * Does not expose the actual IP address
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Simple hash function for IP addresses
 */
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `ip_${Math.abs(hash).toString(16).substring(0, 8)}`;
}

/**
 * Extract IP address from request
 * Handles both direct connections and proxied connections (Cloudflare, etc.)
 */
function extractClientIP(request: NextRequest): string {
  // Check for various headers that might contain the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; use the first one
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to NextRequest's internal IP (may not always be reliable)
  return request.ip || "unknown";
}

/**
 * GET /api/anomaly-detection/ip-hash
 * Returns a hashed IP for anomaly detection
 */
export async function GET(request: NextRequest) {
  try {
    const clientIP = extractClientIP(request);
    const ipHash = hashIP(clientIP);

    return NextResponse.json({
      ipHash,
      // Only return hashed version, never the actual IP
    });
  } catch (error) {
    console.error("[anomaly-detection/ip-hash] Error:", error);
    return NextResponse.json(
      { ipHash: "ip_unknown" },
      { status: 200 } // Return 200 even on error to avoid client-side issues
    );
  }
}
