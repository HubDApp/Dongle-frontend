/**
 * IP Hash API Endpoint
 * Returns a hashed representation of the client IP for anomaly detection
 * Does not expose the actual IP address
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractClientIP, hashClientIP } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/**
 * GET /api/anomaly-detection/ip-hash
 * Returns a hashed IP for anomaly detection
 */
export async function GET(request: NextRequest) {
  try {
    const clientIP = extractClientIP(request);
    const ipHash = hashClientIP(clientIP);

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
