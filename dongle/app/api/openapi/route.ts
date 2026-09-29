/**
 * OpenAPI specification endpoint
 * Serves the auto-generated API documentation
 */

import { NextRequest, NextResponse } from "next/server";
import { generateOpenAPISpec, generateOpenAPIJSON } from "@/lib/openapi-generator";

/**
 * GET /api/openapi
 * Returns OpenAPI 3.1 specification
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  const spec = generateOpenAPISpec();

  if (format === "yaml") {
    // For YAML format, we'd need to add a YAML library
    // For now, return JSON with a note
    return NextResponse.json(
      {
        message: "YAML format not yet implemented. Use format=json or omit parameter.",
        spec,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
