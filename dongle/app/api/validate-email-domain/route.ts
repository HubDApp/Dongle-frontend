import { NextRequest, NextResponse } from "next/server";
import { validateEmailDomain } from "@/lib/email-domain-validator";

/**
 * GET /api/validate-email-domain?email=... or ?domain=...
 *
 * Validates whether an email domain has active MX DNS records.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const domain = searchParams.get("domain");

  const target = email || domain;

  if (!target) {
    return NextResponse.json(
      { error: "Query parameter 'email' or 'domain' is required" },
      { status: 400 }
    );
  }

  const bypassCache = searchParams.get("bypassCache") === "true";

  const result = await validateEmailDomain(target, { bypassCache });

  return NextResponse.json(result, {
    status: result.valid ? 200 : 422,
    headers: {
      "Cache-Control": result.cached
        ? "public, max-age=600"
        : "public, max-age=300",
    },
  });
}
