import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  cookieGet: vi.fn(),
  subscribe: vi.fn(),
  publish: vi.fn(),
  refreshAnalyticsCache: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mocks.getSession }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookieGet }) }));
vi.mock("@/lib/notifications/server-store", () => ({
  subscribeNotifications: mocks.subscribe,
  publishNotificationEvent: mocks.publish,
}));
vi.mock("@/lib/analytics-dashboard/query", () => ({
  refreshAnalyticsCache: mocks.refreshAnalyticsCache,
}));

import { GET as streamGET } from "@/app/api/notifications/stream/route";
import { POST as eventsPOST } from "@/app/api/notifications/events/route";
import { GET as cronAnalyticsGET } from "@/app/api/cron/analytics/route";

const event = {
  id: "evt-1",
  recipientId: "user-1",
  type: "project_verified",
  createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue(null);
  mocks.cookieGet.mockReturnValue(undefined);
});

describe("GET /api/notifications/stream", () => {
  it("returns 401 without a session or recipient cookie", async () => {
    const response = await streamGET();
    expect(response.status).toBe(401);
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it("opens an SSE stream and emits subscribed events", async () => {
    const unsubscribe = vi.fn();
    let push: ((e: typeof event) => void) | undefined;
    mocks.getSession.mockResolvedValue({ sub: "user-1" });
    mocks.subscribe.mockImplementation((_recipient: string, send: typeof push) => {
      push = send;
      return unsubscribe;
    });

    const response = await streamGET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(mocks.subscribe).toHaveBeenCalledWith("user-1", expect.any(Function));

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const ready = decoder.decode((await reader.read()).value);
    expect(ready).toContain("event: ready");

    push!(event);
    let text = "";
    while (!text.includes("\n\n")) {
      text += decoder.decode((await reader.read()).value);
    }
    expect(text).toContain("id: evt-1");
    expect(text).toContain("event: notification");
    expect(text).toContain(JSON.stringify(event));

    await reader.cancel();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("falls back to the recipient cookie", async () => {
    mocks.cookieGet.mockReturnValue({ value: "anon-recipient" });
    mocks.subscribe.mockReturnValue(() => {});
    const response = await streamGET();
    expect(response.status).toBe(200);
    expect(mocks.subscribe).toHaveBeenCalledWith("anon-recipient", expect.any(Function));
    await response.body!.cancel();
  });
});

describe("POST /api/notifications/events", () => {
  const post = (body: string) =>
    eventsPOST(new Request("http://localhost/api/notifications/events", { method: "POST", body }));

  it("stores a valid event", async () => {
    mocks.publish.mockReturnValue({ id: "evt-1" });
    const response = await post(JSON.stringify(event));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, id: "evt-1" });
    expect(mocks.publish).toHaveBeenCalledWith(event);
  });

  it("reports duplicates", async () => {
    mocks.publish.mockReturnValue(null);
    const response = await post(JSON.stringify(event));
    expect(await response.json()).toEqual({ duplicate: true, id: "evt-1" });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await post("{not json");
    expect(response.status).toBe(400);
  });

  it.each(["id", "recipientId", "type", "createdAt"])("returns 400 when %s is missing", async (field) => {
    const body = { ...event, [field]: undefined };
    const response = await post(JSON.stringify(body));
    expect(response.status).toBe(400);
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it("ignores unknown notification types with 202", async () => {
    const response = await post(JSON.stringify({ ...event, type: "not_a_type" }));
    expect(response.status).toBe(202);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/analytics", () => {
  const original = process.env.CRON_SECRET;
  const call = (auth?: string) =>
    cronAnalyticsGET(
      new Request("http://localhost/api/cron/analytics", {
        headers: auth ? { authorization: auth } : {},
      }),
    );

  beforeEach(() => {
    process.env.CRON_SECRET = "s3cret";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("returns 401 without the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(mocks.refreshAnalyticsCache).not.toHaveBeenCalled();
  });

  it("refreshes the cache with a valid secret", async () => {
    mocks.refreshAnalyticsCache.mockResolvedValue({ generatedAt: "2026-01-01", source: "rpc" });
    const response = await call("Bearer s3cret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      generatedAt: "2026-01-01",
      source: "rpc",
      rpcError: null,
    });
  });

  it("returns 500 when aggregation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.refreshAnalyticsCache.mockRejectedValue(new Error("rpc down"));
    const response = await call("Bearer s3cret");
    expect(response.status).toBe(500);
  });
});
