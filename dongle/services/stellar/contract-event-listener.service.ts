/**
 * Issue #877 – Real-Time Monitoring of Smart Contract Events
 *
 * ContractEventListener connects to the Soroban RPC, polls for
 * ProjectRegistered / ReviewSubmitted / VerificationApproved events,
 * filters by optional user address, and emits them as Server-Sent Events
 * (SSE) via the Next.js streaming API.
 *
 * Features
 * ─────────
 * • Poll-based Soroban event fetch (no WebSocket on most RPC nodes)
 * • Reconnect with exponential backoff on failure
 * • Per-user address filtering (only push relevant events)
 * • SSE `data:` frame format compatible with EventSource on the browser
 * • Health check support via getHealth()
 */

import { SOROBAN_CONFIG } from "@/constants/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContractEventName =
  | "ProjectRegistered"
  | "ReviewSubmitted"
  | "VerificationApproved";

export interface ContractEvent {
  type: ContractEventName;
  ledger: number;
  txHash: string;
  contractId: string;
  /** Decoded event payload. */
  payload: Record<string, unknown>;
  emittedAt: string; // ISO
}

export interface ContractEventListenerOptions {
  /** Soroban RPC URL (defaults to env). */
  rpcUrl?: string;
  /** Contract ID to subscribe to. */
  contractId: string;
  /** If set, only events where payload.owner or payload.user matches are emitted. */
  userAddress?: string;
  /** Polling interval in ms (default 5 000). */
  pollIntervalMs?: number;
  /** Starting ledger (default: latest). */
  fromLedger?: number;
  /** Override fetch for tests. */
  fetcher?: typeof fetch;
}

export interface ListenerHealth {
  status: "healthy" | "degraded";
  consecutiveErrors: number;
  lastEventAt: string | null;
  lastLedger: number;
  contractId: string;
  rpcUrl: string;
}

// ─── Supported event names ────────────────────────────────────────────────────

const MONITORED_EVENTS: ContractEventName[] = [
  "ProjectRegistered",
  "ReviewSubmitted",
  "VerificationApproved",
];

// ─── RPC helpers ─────────────────────────────────────────────────────────────

interface RpcEvent {
  type?: string;
  eventType?: string;
  ledger?: number;
  txHash?: string;
  topic?: unknown[];
  value?: unknown;
  contractId?: string;
  pagingToken?: string;
}

async function fetchLatestLedger(rpcUrl: string, fetcher: typeof fetch): Promise<number> {
  const res = await fetcher(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestLedger", params: {} }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = (await res.json()) as { result?: { sequence?: number } };
  if (typeof body.result?.sequence !== "number") throw new Error("No latest ledger in RPC response");
  return body.result.sequence;
}

async function fetchContractEvents(
  rpcUrl: string,
  contractId: string,
  fromLedger: number,
  fetcher: typeof fetch,
): Promise<RpcEvent[]> {
  const events: RpcEvent[] = [];
  let cursor: string | undefined;

  do {
    const res = await fetcher(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getEvents",
        params: {
          startLedger: fromLedger,
          filters: [{ type: "contract", contractIds: [contractId] }],
          pagination: { limit: 100, ...(cursor ? { cursor } : {}) },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`RPC getEvents HTTP ${res.status}`);
    const body = (await res.json()) as {
      result?: { events?: RpcEvent[] };
      error?: { message?: string };
    };
    if (body.error) throw new Error(body.error.message ?? "getEvents RPC error");
    const page = body.result?.events ?? [];
    events.push(...page);
    cursor = page.length === 100 ? (page[page.length - 1]?.pagingToken ?? undefined) : undefined;
  } while (cursor);

  return events;
}

function normalizeEvent(raw: RpcEvent, contractId: string): ContractEvent | null {
  const name = (raw.eventType ?? raw.type) as string | undefined;
  if (!name || !MONITORED_EVENTS.includes(name as ContractEventName)) return null;
  if (typeof raw.ledger !== "number" || typeof raw.txHash !== "string") return null;

  let payload: Record<string, unknown> = {};
  if (raw.value && typeof raw.value === "object") {
    payload = raw.value as Record<string, unknown>;
  }

  return {
    type: name as ContractEventName,
    ledger: raw.ledger,
    txHash: raw.txHash,
    contractId: raw.contractId ?? contractId,
    payload,
    emittedAt: new Date().toISOString(),
  };
}

// ─── ContractEventListener ────────────────────────────────────────────────────

/**
 * Polls the Soroban RPC for contract events and streams them to registered
 * listeners.  Designed to be used server-side inside a Next.js Route Handler
 * that emits SSE responses.
 *
 * @example
 * // In an API route
 * const listener = new ContractEventListener({
 *   contractId: process.env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT!,
 *   userAddress: session.walletAddress,
 * });
 * return listener.streamResponse(request.signal);
 */
export class ContractEventListener {
  private readonly rpcUrl: string;
  private readonly contractId: string;
  private readonly userAddress?: string;
  private readonly pollIntervalMs: number;
  private readonly fetcher: typeof fetch;

  private lastLedger = 0;
  private consecutiveErrors = 0;
  private lastEventAt: string | null = null;

  constructor(opts: ContractEventListenerOptions) {
    this.rpcUrl = opts.rpcUrl ?? SOROBAN_CONFIG.RPC_URL;
    this.contractId = opts.contractId;
    this.userAddress = opts.userAddress;
    this.pollIntervalMs = opts.pollIntervalMs ?? 5_000;
    this.fetcher = opts.fetcher ?? fetch;
    if (opts.fromLedger) this.lastLedger = opts.fromLedger;
  }

  // ── Polling ──────────────────────────────────────────────────────────────

  /** Fetches new events since the last seen ledger. Returns matched events. */
  async poll(): Promise<ContractEvent[]> {
    try {
      if (this.lastLedger === 0) {
        this.lastLedger = await fetchLatestLedger(this.rpcUrl, this.fetcher);
        return [];
      }

      const rawEvents = await fetchContractEvents(
        this.rpcUrl,
        this.contractId,
        this.lastLedger + 1,
        this.fetcher,
      );

      const matched: ContractEvent[] = [];
      for (const raw of rawEvents) {
        const event = normalizeEvent(raw, this.contractId);
        if (!event) continue;
        if (this.userAddress && !this.isRelevantToUser(event)) continue;
        matched.push(event);
        if (event.ledger > this.lastLedger) this.lastLedger = event.ledger;
      }

      if (matched.length > 0) this.lastEventAt = new Date().toISOString();
      this.consecutiveErrors = 0;
      return matched;
    } catch (error) {
      this.consecutiveErrors += 1;
      console.error(
        `[ContractEventListener] poll error (${this.consecutiveErrors} consecutive):`,
        error,
      );
      return [];
    }
  }

  // ── SSE streaming ─────────────────────────────────────────────────────────

  /**
   * Returns a streaming `Response` suitable for a Next.js Route Handler.
   * The client connects with `new EventSource('/api/events/stream?...')`.
   *
   * @param abortSignal - Pass `request.signal` so the stream closes on client disconnect.
   */
  streamResponse(abortSignal?: AbortSignal): Response {
    let closed = false;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start: async (controller) => {
        const push = (data: string) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        abortSignal?.addEventListener("abort", () => {
          closed = true;
          controller.close();
        });

        // Send a heartbeat immediately so the browser confirms the connection.
        push(JSON.stringify({ type: "connected", contractId: this.contractId }));

        while (!closed) {
          const events = await this.poll();
          for (const ev of events) {
            push(JSON.stringify(ev));
          }

          // Heartbeat every poll cycle so proxies don't time out.
          push(JSON.stringify({ type: "heartbeat", ledger: this.lastLedger }));

          // Backoff on consecutive errors: 1 s → 2 s → 4 s (capped at 30 s).
          const errorDelay =
            this.consecutiveErrors > 0
              ? Math.min(1_000 * Math.pow(2, this.consecutiveErrors - 1), 30_000)
              : this.pollIntervalMs;

          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, errorDelay);
            abortSignal?.addEventListener("abort", () => {
              clearTimeout(t);
              resolve();
            });
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // ── Health ────────────────────────────────────────────────────────────────

  getHealth(): ListenerHealth {
    return {
      status: this.consecutiveErrors >= 5 ? "degraded" : "healthy",
      consecutiveErrors: this.consecutiveErrors,
      lastEventAt: this.lastEventAt,
      lastLedger: this.lastLedger,
      contractId: this.contractId,
      rpcUrl: this.rpcUrl,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isRelevantToUser(event: ContractEvent): boolean {
    const p = event.payload;
    return (
      p.owner === this.userAddress ||
      p.user === this.userAddress ||
      p.reviewer === this.userAddress ||
      p.submitter === this.userAddress
    );
  }
}
