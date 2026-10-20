import { CircuitBreaker } from "./circuit-breaker.service";
import { scValToNative, xdr } from "stellar-sdk";
import type { SorobanEventType } from "@/types/indexer";
import {
  enqueueSorobanEvents,
  getLedgerCheckpoint,
  setLedgerCheckpoint,
  setListenerHeartbeat,
} from "./event-queue.service";
import { processQueuedSorobanEvents, processSorobanEvent } from "./event-processor.service";

export interface SorobanListenerConfig {
  rpcUrl: string;
  contractId: string;
  pollIntervalMs?: number;
  initialLedger?: number;
  fetcher?: typeof fetch;
}

export interface RawSorobanEvent {
  type: SorobanEventType;
  ledger: number;
  txHash: string;
  payload: Record<string, unknown>;
}

const SUPPORTED_EVENTS: SorobanEventType[] = [
  "ProjectRegistered",
  "ProjectUpdated",
  "ReviewSubmitted",
  "VerificationApproved",
  "VerificationRejected",
];

interface RpcSorobanEvent {
  type?: string;
  eventType?: string;
  ledger?: number;
  txHash?: string;
  topic?: unknown[];
  value?: unknown;
  payload?: Record<string, unknown>;
  pagingToken?: string;
}

function decodeScVal(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return scValToNative(xdr.ScVal.fromXDR(value, "base64"));
  } catch {
    return value;
  }
}

function normalizeEvent(event: RpcSorobanEvent): RawSorobanEvent | null {
  const eventName = event.eventType ?? (event.type === "contract" ? decodeScVal(event.topic?.[0]) : event.type);
  if (typeof eventName !== "string" || !SUPPORTED_EVENTS.includes(eventName as SorobanEventType)) {
    return null;
  }

  const decodedPayload = decodeScVal(event.value);
  const payload = event.payload ?? (decodedPayload instanceof Map
    ? Object.fromEntries(decodedPayload) as Record<string, unknown>
    : decodedPayload && typeof decodedPayload === "object"
    ? decodedPayload as Record<string, unknown>
    : { value: decodedPayload });
  if (typeof event.ledger !== "number" || typeof event.txHash !== "string") return null;

  return { type: eventName as SorobanEventType, ledger: event.ledger, txHash: event.txHash, payload };
}

export class SorobanEventListener {
  private readonly breaker: CircuitBreaker;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastLedger = 0;
  private latestScannedLedger = 0;
  private polling = false;

  constructor(private readonly config: SorobanListenerConfig) {
    this.breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 30_000 });
  }

  start(onEvent?: (count: number) => void): void {
    if (this.pollTimer) return;
    const interval = this.config.pollIntervalMs ?? 5_000;

    this.pollTimer = setInterval(() => {
      if (!this.polling) {
        void this.poll(onEvent).catch((error) => {
          console.error("[soroban-indexer] poll failed; will retry", error);
        });
      }
    }, interval);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async poll(onEvent?: (count: number) => void): Promise<number> {
    if (this.polling) return 0;
    this.polling = true;
    try {
      await setListenerHeartbeat(this.config.contractId);
      const checkpoint = await getLedgerCheckpoint(this.config.contractId);
      if (checkpoint === 0 && this.lastLedger === 0) {
        this.lastLedger = this.config.initialLedger ?? await this.fetchLatestLedger();
        if (this.lastLedger > 0) {
          await setLedgerCheckpoint(this.config.contractId, this.lastLedger);
        }
      } else {
        this.lastLedger = Math.max(this.lastLedger, checkpoint);
      }
      let processedLedger = this.lastLedger;
      await processQueuedSorobanEvents(async (event) => {
        await processSorobanEvent(event);
        processedLedger = Math.max(processedLedger, event.ledger);
      });
      if (processedLedger > this.lastLedger) {
        this.lastLedger = processedLedger;
        await setLedgerCheckpoint(this.config.contractId, this.lastLedger);
      }
      const events = await this.fetchEventsSince(this.lastLedger + 1);
      await enqueueSorobanEvents(events.map((event) => ({
          ...event,
          contractId: this.config.contractId,
        })));
      await processQueuedSorobanEvents(async (event) => {
        await processSorobanEvent(event);
        processedLedger = Math.max(processedLedger, event.ledger);
      });
      this.lastLedger = Math.max(processedLedger, this.latestScannedLedger);
      if (this.lastLedger > 0) await setLedgerCheckpoint(this.config.contractId, this.lastLedger);
      onEvent?.(events.length);
      return events.length;
    } finally {
      this.polling = false;
    }
  }

  async fetchEventsSince(fromLedger: number): Promise<RawSorobanEvent[]> {
    return this.breaker.execute(async () => {
      let cursor: string | undefined;
      const events: RawSorobanEvent[] = [];
      do {
        const response = await (this.config.fetcher ?? fetch)(this.config.rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getEvents",
            params: {
              startLedger: fromLedger,
              filters: [{ type: "contract", contractIds: [this.config.contractId] }],
              pagination: { limit: 100, ...(cursor ? { cursor } : {}) },
            },
          }),
          signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
          throw new Error(`RPC events fetch failed: ${response.status}`);
        }

        const body = (await response.json()) as {
          result?: { events?: RpcSorobanEvent[]; latestLedger?: number };
          events?: RpcSorobanEvent[];
          error?: { message?: string };
        };
        if (body.error) throw new Error(body.error.message ?? "Soroban RPC getEvents failed");
        const page = body.result?.events ?? body.events ?? [];
        this.latestScannedLedger = Math.max(this.latestScannedLedger, body.result?.latestLedger ?? 0);
        events.push(...page.map(normalizeEvent).filter((event): event is RawSorobanEvent => event !== null));
        cursor = page.length === 100 ? page[page.length - 1]?.pagingToken : undefined;
      } while (cursor);

      return events.sort((a, b) => a.ledger - b.ledger);
    });
  }

  private async fetchLatestLedger(): Promise<number> {
    return this.breaker.execute(async () => {
      const response = await (this.config.fetcher ?? fetch)(this.config.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestLedger", params: {} }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`RPC latest-ledger fetch failed: ${response.status}`);
      const body = await response.json() as { result?: { sequence?: number } };
      if (typeof body.result?.sequence !== "number") {
        throw new Error("Soroban RPC did not return the latest ledger sequence");
      }
      return body.result.sequence;
    });
  }

  getLastLedger(): number {
    return this.lastLedger;
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.breaker;
  }
}
