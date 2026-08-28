import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  cacheGetFresh,
  cacheSet,
  configureDataLayer,
  getJson,
  invalidateAfterMutation,
  invalidateAll,
  invalidateKey,
  invalidatePrefix,
  invalidateStale,
  invalidateTag,
  mutate,
  setOnline,
  subscribeInvalidation,
} from "@/lib/data-layer";
import { createRequestKey } from "@/lib/data-layer";
import { projectMetaCache } from "@/lib/project-cache";
import type { Project } from "@/types/project";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
  } as Response;
}

const makeProject = (id: string): Project => ({
  id,
  name: `Project ${id}`,
  primaryCategory: "DeFi / DEX",
  description: "Test project",
  rating: 4,
  reviews: 1,
  createdAt: "2024-01-01T00:00:00Z",
});

describe("cache invalidation", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    setOnline(true);
    projectMetaCache.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("invalidates related cached data after a successful mutation", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ reviews: [1] }))
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ reviews: [1, 2] }));

    await getJson({ url: "/api/reviews", tags: ["reviews"] });
    expect(cacheGetFresh(createRequestKey({ url: "/api/reviews" }))).toEqual({ reviews: [1] });

    await mutate({
      method: "POST",
      url: "/api/reviews",
      body: { rating: 5 },
      invalidateTags: ["reviews"],
    });

    expect(cacheGetFresh(createRequestKey({ url: "/api/reviews" }))).toBeUndefined();

    const refreshed = await getJson({ url: "/api/reviews", tags: ["reviews"] });
    expect(refreshed.data).toEqual({ reviews: [1, 2] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("leaves unrelated cached data intact", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ reviews: true }))
      .mockResolvedValueOnce(jsonResponse({ drafts: true }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    await getJson({ url: "/api/reviews", tags: ["reviews"] });
    await getJson({ url: "/api/drafts/w/d", tags: ["drafts"] });

    await mutate({
      method: "POST",
      url: "/api/reviews",
      body: { rating: 5 },
      invalidateTags: ["reviews"],
    });

    expect(cacheGetFresh(createRequestKey({ url: "/api/reviews" }))).toBeUndefined();
    expect(cacheGetFresh(createRequestKey({ url: "/api/drafts/w/d" }))).toEqual({ drafts: true });
  });

  it("supports time-based invalidation", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    configureDataLayer({ cacheTtlMs: 100, staleTtlMs: 1_000 });

    cacheSet("GET:/api/reviews", { n: 1 }, { tags: ["reviews"] });
    expect(cacheGetFresh("GET:/api/reviews")).toEqual({ n: 1 });

    vi.setSystemTime(new Date("2026-01-01T00:00:00.101Z"));
    const removed = invalidateStale();
    expect(removed).toContain("GET:/api/reviews");
    expect(cacheGetFresh("GET:/api/reviews")).toBeUndefined();
  });

  it("supports manual key invalidation", () => {
    cacheSet("GET:/api/reviews", { n: 1 });
    invalidateKey("GET:/api/reviews");
    expect(cacheGetFresh("GET:/api/reviews")).toBeUndefined();
  });

  it("supports grouped prefix invalidation", () => {
    cacheSet("GET:/api/reviews", { all: true });
    cacheSet("GET:/api/reviews?projectId=p1", { p1: true });
    cacheSet("GET:/api/drafts", { drafts: true });

    invalidatePrefix("GET:/api/reviews");

    expect(cacheGetFresh("GET:/api/reviews")).toBeUndefined();
    expect(cacheGetFresh("GET:/api/reviews?projectId=p1")).toBeUndefined();
    expect(cacheGetFresh("GET:/api/drafts")).toEqual({ drafts: true });
  });

  it("supports global invalidation including project metadata cache", () => {
    cacheSet("GET:/api/reviews", { n: 1 });
    projectMetaCache.set("alpha", makeProject("alpha"));

    invalidateAll();

    expect(cacheGetFresh("GET:/api/reviews")).toBeUndefined();
    expect(projectMetaCache.get("alpha")).toBeUndefined();
  });

  it("notifies subscribers so callers can refetch once", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ n: 1 }));
    const keys: string[][] = [];
    const stop = subscribeInvalidation((changed) => keys.push(changed));

    invalidateAfterMutation({ tags: ["reviews"], keys: ["GET:/api/reviews"] });
    stop();

    expect(keys.some((batch) => batch.includes("GET:/api/reviews"))).toBe(true);
  });

  it("does not create duplicate network calls when many callers refetch after invalidation", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ n: 1 }));
    await getJson({ url: "/api/reviews", tags: ["reviews"] });
    invalidateTag("reviews");

    let resolveFetch: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const a = getJson({ url: "/api/reviews", tags: ["reviews"] });
    const b = getJson({ url: "/api/reviews", tags: ["reviews"] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolveFetch?.(jsonResponse({ n: 2 }));
    await Promise.all([a, b]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("invalidates affected cache after offline synchronization", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ reviews: [] }));
    await getJson({ url: "/api/reviews", tags: ["reviews"] });
    expect(cacheGetFresh(createRequestKey({ url: "/api/reviews" }))).toBeDefined();

    setOnline(false);
    await mutate({
      method: "POST",
      url: "/api/reviews",
      body: { rating: 5 },
      invalidateTags: ["reviews"],
      queueWhenOffline: true,
    });

    expect(cacheGetFresh(createRequestKey({ url: "/api/reviews" }))).toBeDefined();

    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    setOnline(true);
    const { syncQueuedMutations } = await import("@/lib/data-layer");
    await syncQueuedMutations();

    expect(cacheGetFresh(createRequestKey({ url: "/api/reviews" }))).toBeUndefined();
  });
});
