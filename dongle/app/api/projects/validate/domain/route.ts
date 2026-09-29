import { NextRequest, NextResponse } from "next/server";
import { validateProjectDomain } from "@/lib/project-domain-validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("domain") ?? searchParams.get("url");
  const bypassCache = searchParams.get("bypassCache") === "true";

  const result = await validateProjectDomain(target, { bypassCache });

  return NextResponse.json(result, {
    status: result.valid ? 200 : 422,
    headers: {
      "Cache-Control": result.info?.cached ? "public, max-age=600" : "public, max-age=300",
    },
  });
}
