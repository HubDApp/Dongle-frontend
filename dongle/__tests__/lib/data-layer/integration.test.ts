import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDedupMetrics,
  getJson,
  getPendingMutations,
  mutate,
  setOnline,
  syncQueuedMutations,
} from "@/lib/data-layer";
import { createRequestKey } from "@/lib/data-layer";
import { cacheGetFresh } from "@/lib/data-layer";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
  } as Response;
}

describe("data-layer integration (#910 + #913 + #911)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    setOnline(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves a request from cache while offline", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ resource: "reviews" }));
    await getJson({ url: "/api/reviews", tags: ["reviews"] });
    setOnline(false);
    const result = await getJson({ url: "/api/reviews", tags: ["reviews"] });
    expect(result.fromCache).toBe(true);
    expect(result.data).toEqual({ resource: "reviews" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shares one network call across two concurrent consumers", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const a = getJson({ url: "/api/reviews", tags: ["reviews"] });
    const b = getJson({ url: "/api/reviews", tags: ["reviews"] });
    resolveFetch?.(jsonResponse({ shared: true }));
    const [ra, rb] = await Promise.all([a, b]);

    expect(ra.data).toEqual(rb.data);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getDedupMetrics().deduplicatedCount).toBeGreaterThanOrEqual(1);
  });

  it("queues an offline mutation, syncs on reconnect, invalidates, and refreshes without duplicates", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ reviews: [] }));
    await getJson({ url: "/api/reviews", tags: ["reviews"] });
    const key = createRequestKey({ url: "/api/reviews" });
    expect(cacheGetFresh(key)).toEqual({ reviews: [] });

    setOnline(false);
    const queued = await mutate({
      method: "POST",
      url: "/api/reviews",
      body: { rating: 5, comment: "Queued while offline" },
      invalidateTags: ["reviews"],
      queueWhenOffline: true,
      idempotencyKey: "reviews.add|user1|proj1",
    });
    expect(queued.queued).toBe(true);
    expect(getPendingMutations()).toHaveLength(1);

    const duplicate = await mutate({
      method: "POST",
      url: "/api/reviews",
      body: { rating: 5, comment: "Queued while offline" },
      invalidateTags: ["reviews"],
      queueWhenOffline: true,
      idempotencyKey: "reviews.add|user1|proj1",
    });
    expect(duplicate.queued).toBe(true);
    expect(getPendingMutations()).toHaveLength(1);

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, id: "rev-1" }))
      .mockResolvedValueOnce(jsonResponse({ reviews: [{ id: "rev-1" }] }));

    setOnline(true);
    const report = await syncQueuedMutations();
    expect(report.succeeded).toBe(1);
    expect(report.attempted).toBe(1);
    expect(cacheGetFresh(key)).toBeUndefined();

    const refreshed = await getJson({ url: "/api/reviews", tags: ["reviews"] });
    expect(refreshed.fromCache).toBe(false);
    expect(refreshed.data).toEqual({ reviews: [{ id: "rev-1" }] });

    await syncQueuedMutations();
    const postCalls = fetchMock.mock.calls.filter(
      (call) => (call[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(postCalls).toHaveLength(1);
  });
});
