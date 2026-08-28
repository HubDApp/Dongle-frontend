import { CircuitBreaker } from "./circuit-breaker";
import { indexEvent } from "./event-store";
import type { SorobanEventType } from "@/types/indexer";

export interface SorobanListenerConfig {
  rpcUrl: string;
  contractId: string;
  pollIntervalMs?: number;
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
];

export class SorobanEventListener {
  private readonly breaker: CircuitBreaker;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastLedger = 0;

  constructor(private readonly config: SorobanListenerConfig) {
    this.breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 30_000 });
  }

  start(onEvent?: (count: number) => void): void {
    if (this.pollTimer) return;
    const interval = this.config.pollIntervalMs ?? 5_000;

    this.pollTimer = setInterval(() => {
      void this.poll(onEvent);
    }, interval);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async poll(onEvent?: (count: number) => void): Promise<number> {
    const events = await this.fetchEventsSince(this.lastLedger);
    for (const event of events) {
      indexEvent(event.type, event.payload, {
        contractId: this.config.contractId,
        ledger: event.ledger,
        txHash: event.txHash,
      });
      this.lastLedger = Math.max(this.lastLedger, event.ledger);
    }
    onEvent?.(events.length);
    return events.length;
  }

  async fetchEventsSince(fromLedger: number): Promise<RawSorobanEvent[]> {
    return this.breaker.execute(async () => {
      const url = `${this.config.rpcUrl}/events?contract=${encodeURIComponent(this.config.contractId)}&from=${fromLedger}`;
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`RPC events fetch failed: ${response.status}`);
      }

      const body = (await response.json()) as { events?: RawSorobanEvent[] };
      const events = (body.events ?? []).filter((e) => SUPPORTED_EVENTS.includes(e.type));
      return events;
    });
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.breaker;
  }
}
