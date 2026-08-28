import { NextRequest, NextResponse } from "next/server";
import { queryEvents, seedDemoEvents } from "@/services/indexer/event-store.service";
import type { SorobanEventType } from "@/types/indexer";

let seeded = false;

function ensureSeeded() {
  if (!seeded) {
    const contractId =
      process.env.NEXT_PUBLIC_SOROBAN_CONTRACT_ID ?? "CDEMOCONTRACT000000000000000000000";
    seedDemoEvents(contractId);
    seeded = true;
  }
}

export async function GET(request: NextRequest) {
  ensureSeeded();

  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get("eventType") as SorobanEventType | null;
  const contractId = searchParams.get("contractId") ?? undefined;
  const fromLedger = searchParams.get("fromLedger")
    ? Number(searchParams.get("fromLedger"))
    : undefined;
  const toLedger = searchParams.get("toLedger")
    ? Number(searchParams.get("toLedger"))
    : undefined;
  const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
  const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : 0;

  const result = queryEvents({
    eventType: eventType ?? undefined,
    contractId,
    fromLedger,
    toLedger,
    limit,
    offset,
  });

  return NextResponse.json({ success: true, ...result });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { historical } = body as {
      historical?: Array<{
        eventType: SorobanEventType;
        contractId: string;
        ledger: number;
        txHash: string;
        payload: Record<string, unknown>;
      }>;
    };

    if (!historical?.length) {
      return NextResponse.json(
        { success: false, error: "historical events array required" },
        { status: 400 },
      );
    }

    const { replayHistoricalEvents } = await import("@/services/indexer/event-store.service");
    const replayed = replayHistoricalEvents(historical);
    return NextResponse.json({ success: true, count: replayed.length, data: replayed });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
