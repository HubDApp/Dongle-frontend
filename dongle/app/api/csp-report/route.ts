import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/csp-report
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * The `report-uri` directive in our CSP points here.
 *
 * In production, replace the console.warn with your logging/monitoring
 * pipeline (e.g. Sentry, Datadog, CloudWatch).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // CSP reports are wrapped in a `csp-report` key
    const report =
      (body as Record<string, unknown>)["csp-report"] ?? body;

    console.warn("[CSP Violation]", JSON.stringify(report, null, 2));

    return NextResponse.json({ received: true }, { status: 204 });
  } catch {
    // Malformed report — still acknowledge so browsers stop retrying
    return NextResponse.json({ received: true }, { status: 204 });
  }
}
