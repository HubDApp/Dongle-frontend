/**
 * Client IP Endpoint
 *
 * Returns the caller's own IP address (and a non-reversible hash of it) so the
 * form audit log can record it. A browser cannot read its own public IP, so it
 * is resolved here — server-side — from proxy headers. The header precedence is
 * shared with the anomaly-detection IP hash endpoint via `lib/request-ip.ts`.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIpContext } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/**
 * GET /api/audit/client-ip
 * Returns `{ ipAddress, ipHash, ipSource }` for the calling client.
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(clientIpContext(request));
  } catch (error) {
    console.error("[audit/client-ip] Error:", error);
    return NextResponse.json(
      { ipAddress: null, ipHash: null, ipSource: "unavailable" },
      { status: 200 }, // Return 200 even on error to avoid client-side issues
    );
  }
}
