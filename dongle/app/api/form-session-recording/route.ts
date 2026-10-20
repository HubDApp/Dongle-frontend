/**
 * POST /api/form-session-recording — store consented session recordings.
 * Never accepts unmasked password values (server-side scrub).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { FormSessionRecording, SessionEvent } from "@/services/form-session-recording";

export const dynamic = "force-dynamic";

const store: FormSessionRecording[] = [];
const MAX = 50;

const SENSITIVE = /password|secret|seed|mnemonic|token|otp|pin|cvv|ssn|card/i;

function scrubEvents(events: SessionEvent[]): SessionEvent[] {
  return events.map((e) => {
    if (e.fieldId && SENSITIVE.test(e.fieldId)) {
      return { ...e, valuePreview: "••••••••" };
    }
    if (e.valuePreview && e.valuePreview !== "••••••••" && e.valuePreview.length > 80) {
      return { ...e, valuePreview: e.valuePreview.slice(0, 80) };
    }
    return e;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FormSessionRecording;
    if (!body?.id || !body?.formId || !body?.consented) {
      return NextResponse.json(
        { error: "consented recording with id and formId required" },
        { status: 400 },
      );
    }

    const scrubbed: FormSessionRecording = {
      ...body,
      events: scrubEvents(body.events ?? []),
    };

    store.push(scrubbed);
    if (store.length > MAX) store.shift();

    return NextResponse.json({ ok: true, id: scrubbed.id, events: scrubbed.events.length });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const formId = request.nextUrl.searchParams.get("formId");
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const found = store.find((r) => r.id === id);
    if (!found) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(found);
  }
  const filtered = formId ? store.filter((r) => r.formId === formId) : store;
  return NextResponse.json({
    count: filtered.length,
    recordings: filtered.map((r) => ({
      id: r.id,
      formId: r.formId,
      formType: r.formType,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      durationMs: r.durationMs,
      eventCount: r.events.length,
    })),
  });
}
