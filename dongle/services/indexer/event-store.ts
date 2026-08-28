import type { EventsQueryParams, IndexedEvent, SorobanEventType } from "@/types/indexer";

const events: IndexedEvent[] = [];

function generateId(): string {
  return crypto.randomUUID();
}

export function indexEvent(
  eventType: SorobanEventType,
  payload: Record<string, unknown>,
  meta: { contractId: string; ledger: number; txHash: string },
): IndexedEvent {
  const entry: IndexedEvent = {
    id: generateId(),
    eventType,
    contractId: meta.contractId,
    ledger: meta.ledger,
    txHash: meta.txHash,
    payload,
    indexedAt: new Date().toISOString(),
  };
  events.push(entry);
  return entry;
}

export function queryEvents(params: EventsQueryParams = {}): {
  events: IndexedEvent[];
  total: number;
} {
  let result = [...events];

  if (params.eventType) {
    result = result.filter((e) => e.eventType === params.eventType);
  }
  if (params.contractId) {
    result = result.filter((e) => e.contractId === params.contractId);
  }
  if (params.fromLedger !== undefined) {
    result = result.filter((e) => e.ledger >= params.fromLedger!);
  }
  if (params.toLedger !== undefined) {
    result = result.filter((e) => e.ledger <= params.toLedger!);
  }

  result.sort((a, b) => b.ledger - a.ledger);
  const total = result.length;
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 50;
  return { events: result.slice(offset, offset + limit), total };
}

export function replayHistoricalEvents(
  historical: Omit<IndexedEvent, "id" | "indexedAt">[],
): IndexedEvent[] {
  const replayed: IndexedEvent[] = [];
  for (const item of historical) {
    replayed.push(
      indexEvent(item.eventType, item.payload, {
        contractId: item.contractId,
        ledger: item.ledger,
        txHash: item.txHash,
      }),
    );
  }
  return replayed;
}

export function resetEventStore(): void {
  events.length = 0;
}

export function seedDemoEvents(contractId: string): IndexedEvent[] {
  const demo: Omit<IndexedEvent, "id" | "indexedAt">[] = [
    {
      eventType: "ProjectRegistered",
      contractId,
      ledger: 1000,
      txHash: "demo-tx-1",
      payload: { projectId: "demo-1", name: "Demo Project" },
    },
    {
      eventType: "ReviewSubmitted",
      contractId,
      ledger: 1001,
      txHash: "demo-tx-2",
      payload: { projectId: "demo-1", rating: 5 },
    },
  ];
  return replayHistoricalEvents(demo);
}
