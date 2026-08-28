import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker } from "@/services/indexer/circuit-breaker.service";
import {
  indexEvent,
  queryEvents,
  replayHistoricalEvents,
  resetEventStore,
} from "@/services/indexer/event-store.service";

describe("indexer services", () => {
  beforeEach(() => {
    resetEventStore();
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
