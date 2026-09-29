/**
 * POST /api/form-conversion — ingest conversion events (optional remote sink).
 * GET  /api/form-conversion?formId=… — funnel analysis from in-memory store.
 *
 * Primary tracking is client-local; this route supports optional aggregation.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ConversionTracker,
  type ConversionEvent,
  type ConversionEventName,
} from "@/services/form-conversion";

export const dynamic = "force-dynamic";

const tracker = new ConversionTracker({ persistLocally: false });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, formId, formType, properties } = body as {
      name?: ConversionEventName;
      formId?: string;
      formType?: string;
      properties?: Record<string, string | number | boolean | null>;
    };

    if (!name || !formId || !formType) {
      return NextResponse.json(
        { error: "name, formId, and formType are required" },
        { status: 400 },
      );
    }

    const event = tracker.track(name, formId, formType, properties);
    return NextResponse.json({ ok: true, event });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const formId = request.nextUrl.searchParams.get("formId");
  if (!formId) {
    return NextResponse.json({ error: "formId required" }, { status: 400 });
  }
  const formType = request.nextUrl.searchParams.get("formType") ?? undefined;
  const funnel = tracker.analyzeFunnel(formId, formType);
  const events = tracker.getEvents(formId, formType) as ConversionEvent[];
  return NextResponse.json({ funnel, eventCount: events.length });
}
