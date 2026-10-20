import { redis } from "@/lib/redis";
import type { SorobanEventType } from "@/types/indexer";

export interface QueuedSorobanEvent {
  type: SorobanEventType;
  ledger: number;
  txHash: string;
  payload: Record<string, unknown>;
  contractId: string;
}

const QUEUE_KEY = "soroban:indexer:pending";
const memoryQueue: QueuedSorobanEvent[] = [];
const memoryCheckpoints = new Map<string, number>();
const memoryHeartbeats = new Map<string, number>();

export async function enqueueSorobanEvent(event: QueuedSorobanEvent): Promise<void> {
  await enqueueSorobanEvents([event]);
}

export async function enqueueSorobanEvents(events: QueuedSorobanEvent[]): Promise<void> {
  if (events.length === 0) return;
  if (redis) {
    await redis.rpush(QUEUE_KEY, ...events.map((event) => JSON.stringify(event)));
    return;
  }
  memoryQueue.push(...events);
}

export async function peekSorobanEvent(): Promise<QueuedSorobanEvent | null> {
  if (!redis) return memoryQueue[0] ?? null;
  const items = await redis.lrange<string | QueuedSorobanEvent>(QUEUE_KEY, 0, 0);
  const item = items[0];
  if (!item) return null;
  return typeof item === "string" ? JSON.parse(item) as QueuedSorobanEvent : item;
}

export async function acknowledgeSorobanEvent(event: QueuedSorobanEvent): Promise<void> {
  if (!redis) {
    const index = memoryQueue.indexOf(event);
    if (index >= 0) memoryQueue.splice(index, 1);
    return;
  }
  await redis.lrem(QUEUE_KEY, 1, JSON.stringify(event));
}

export async function sorobanQueueDepth(): Promise<number> {
  return redis ? redis.llen(QUEUE_KEY) : memoryQueue.length;
}

export async function getLedgerCheckpoint(contractId: string): Promise<number> {
  if (!redis) return memoryCheckpoints.get(contractId) ?? 0;
  const value = await redis.get<string | number>(`soroban:indexer:checkpoint:${contractId}`);
  return Number(value) || 0;
}

export async function setLedgerCheckpoint(contractId: string, ledger: number): Promise<void> {
  if (!redis) {
    memoryCheckpoints.set(contractId, ledger);
    return;
  }
  await redis.set(`soroban:indexer:checkpoint:${contractId}`, ledger);
}

export async function setListenerHeartbeat(contractId: string): Promise<void> {
  const timestamp = Date.now();
  if (!redis) {
    memoryHeartbeats.set(contractId, timestamp);
    return;
  }
  await redis.set(`soroban:indexer:heartbeat:${contractId}`, timestamp);
}

export async function getListenerHeartbeat(contractId: string): Promise<number> {
  if (!redis) return memoryHeartbeats.get(contractId) ?? 0;
  const value = await redis.get<string | number>(`soroban:indexer:heartbeat:${contractId}`);
  return Number(value) || 0;
}

export function resetSorobanQueueForTests(): void {
  memoryQueue.length = 0;
  memoryCheckpoints.clear();
  memoryHeartbeats.clear();
}