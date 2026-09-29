/**
 * POST /api/form-heatmap — accept heatmap snapshots for aggregation.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { HeatmapSnapshot } from "@/services/form-heatmap";

export const dynamic = "force-dynamic";

const snapshots: HeatmapSnapshot[] = [];
const MAX = 100;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HeatmapSnapshot;
    if (!body?.formId || !body?.sessionId) {
      return NextResponse.json(
        { error: "formId and sessionId required" },
        { status: 400 },
      );
    }

    snapshots.push(body);
    if (snapshots.length > MAX) snapshots.shift();

    return NextResponse.json({
      ok: true,
      problemAreaCount: body.problemAreas?.length ?? 0,
      clickCount: body.clicks?.length ?? 0,
      maxScrollDepth: body.maxScrollDepth ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const formId = request.nextUrl.searchParams.get("formId");
  const filtered = formId
    ? snapshots.filter((s) => s.formId === formId)
    : snapshots;
  return NextResponse.json({
    count: filtered.length,
    snapshots: filtered.slice(-20),
  });
}
