import { describe, it, expect } from "vitest";
import { clientIpContext, extractClientIP, hashClientIP } from "@/lib/request-ip";

function makeRequest(headers: Record<string, string> = {}, ip?: string) {
  const lower: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lower[key.toLowerCase()] = value;
  }
  return {
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    ip,
  };
}

describe("extractClientIP", () => {
  it("uses the first entry of x-forwarded-for", () => {
    const request = makeRequest({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" });
    expect(extractClientIP(request)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(extractClientIP(makeRequest({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("falls back to cf-connecting-ip last", () => {
    expect(extractClientIP(makeRequest({ "cf-connecting-ip": "192.0.2.9" }))).toBe("192.0.2.9");
  });

  it("prefers forwarded headers over the runtime ip", () => {
    const request = makeRequest({ "x-real-ip": "198.51.100.4" }, "10.0.0.99");
    expect(extractClientIP(request)).toBe("198.51.100.4");
  });

  it("uses the runtime ip when no headers are present", () => {
    expect(extractClientIP(makeRequest({}, "10.0.0.99"))).toBe("10.0.0.99");
  });

  it("returns 'unknown' when nothing can be resolved", () => {
    expect(extractClientIP(makeRequest())).toBe("unknown");
  });
});

describe("hashClientIP", () => {
  it("is deterministic and prefixed", () => {
    const first = hashClientIP("203.0.113.7");
    const second = hashClientIP("203.0.113.7");
    expect(first).toBe(second);
    expect(first.startsWith("ip_")).toBe(true);
  });

  it("differs for different addresses", () => {
    expect(hashClientIP("203.0.113.7")).not.toBe(hashClientIP("203.0.113.8"));
  });
});

describe("clientIpContext", () => {
  it("returns the address and hash with server provenance", () => {
    const context = clientIpContext(makeRequest({ "x-forwarded-for": "203.0.113.7" }));
    expect(context.ipAddress).toBe("203.0.113.7");
    expect(context.ipHash).toBe(hashClientIP("203.0.113.7"));
    expect(context.ipSource).toBe("server");
  });

  it("returns nulls when the address cannot be resolved", () => {
    expect(clientIpContext(makeRequest())).toEqual({
      ipAddress: null,
      ipHash: null,
      ipSource: "unavailable",
    });
  });
});
