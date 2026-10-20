import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker } from "@/services/indexer/circuit-breaker.service";
import {
  indexEvent,
  queryEvents,
  replayHistoricalEvents,
  resetEventStore,
} from "@/services/indexer/event-store.service";
import { SorobanEventListener } from "@/services/indexer/soroban-listener.service";
import { processSorobanEvent } from "@/services/indexer/event-processor.service";
import { resetSorobanQueueForTests } from "@/services/indexer/event-queue.service";
import { listNotifications, resetNotificationBusForTests } from "@/lib/notifications/server-store";

describe("indexer services", () => {
  beforeEach(() => {
    resetEventStore();
    resetSorobanQueueForTests();
    resetNotificationBusForTests();
  });

  it("stores and queries events", () => {
    indexEvent("ProjectRegistered", { projectId: "p1" }, {
      contractId: "C123",
      ledger: 100,
      txHash: "tx1",
    });

    const { events, total } = queryEvents({ eventType: "ProjectRegistered" });
    expect(total).toBe(1);
    expect(events[0].eventType).toBe("ProjectRegistered");
  });

  it("replays historical events", () => {
    const replayed = replayHistoricalEvents([
      {
        eventType: "ReviewSubmitted",
        contractId: "C123",
        ledger: 200,
        txHash: "tx2",
        payload: { rating: 5 },
      },
    ]);
    expect(replayed).toHaveLength(1);
    expect(queryEvents().total).toBe(1);
  });

  it("queries Soroban RPC and resumes from the last successfully indexed ledger", async () => {
    let requestBody: Record<string, unknown> | undefined;
    let fail = true;
    const listener = new SorobanEventListener({
      rpcUrl: "https://rpc.example",
      contractId: "C123",
      initialLedger: 0,
      fetcher: async (_input, init) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        if (fail) {
          fail = false;
          return new Response("RPC unavailable", { status: 503 });
        }
        return Response.json({
          result: {
            events: [{
              eventType: "VerificationRejected",
              ledger: 42,
              txHash: "tx42",
              payload: { projectId: "p1" },
            }],
          },
        });
      },
    });

    await expect(listener.poll()).rejects.toThrow("RPC events fetch failed: 503");
    expect(listener.getLastLedger()).toBe(0);
    await expect(listener.poll()).resolves.toBe(1);
    expect(requestBody?.method).toBe("getEvents");
    expect((requestBody?.params as { startLedger: number }).startLedger).toBe(1);
    expect(listener.getLastLedger()).toBe(42);
    expect(queryEvents({ eventType: "VerificationRejected" }).total).toBe(1);
  });

  it("notifies only addresses included in the on-chain event payload", async () => {
    await processSorobanEvent({
      type: "ReviewSubmitted",
      ledger: 42,
      txHash: "tx42",
      contractId: "C123",
      payload: { projectId: "p1", owner: "GOWNER", submitterAddress: "GSUBMITTER" },
    });

    expect(listNotifications("GOWNER")).toHaveLength(1);
    expect(listNotifications("GSUBMITTER")).toHaveLength(1);
    expect(listNotifications("GUNRELATED")).toHaveLength(0);
  });

  it("opens circuit after repeated failures", async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000 });
    const fail = () => breaker.execute(async () => {
      throw new Error("rpc down");
    });

    await expect(fail()).rejects.toThrow("rpc down");
    await expect(fail()).rejects.toThrow("rpc down");
    expect(breaker.getState()).toBe("open");
    await expect(fail()).rejects.toThrow("Circuit breaker is open");
  });
});
