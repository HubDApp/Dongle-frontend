import { describe, it, expect } from "vitest";
import { createRequestKey, buildUrlWithParams, stableStringify } from "@/lib/data-layer";

describe("createRequestKey", () => {
  it("is deterministic for the same method, URL, params, and body", () => {
    const a = createRequestKey({
      method: "GET",
      url: "/api/reviews",
      params: { projectId: "p1", sort: "new" },
    });
    const b = createRequestKey({
      method: "get",
      url: "/api/reviews",
      params: { sort: "new", projectId: "p1" },
    });
    expect(a).toBe(b);
  });

  it("sorts query parameters already present in the URL", () => {
    const a = createRequestKey({ method: "GET", url: "/api/x?b=2&a=1" });
    const b = createRequestKey({ method: "GET", url: "/api/x?a=1&b=2" });
    expect(a).toBe(b);
  });

  it("distinguishes different URLs", () => {
    expect(createRequestKey({ url: "/api/reviews" })).not.toBe(
      createRequestKey({ url: "/api/drafts" }),
    );
  });

  it("distinguishes different query parameters", () => {
    expect(
      createRequestKey({ url: "/api/reviews", params: { projectId: "a" } }),
    ).not.toBe(
      createRequestKey({ url: "/api/reviews", params: { projectId: "b" } }),
    );
  });

  it("distinguishes different request bodies", () => {
    expect(
      createRequestKey({ method: "POST", url: "/api/reviews", body: { rating: 5 } }),
    ).not.toBe(
      createRequestKey({ method: "POST", url: "/api/reviews", body: { rating: 4 } }),
    );
  });

  it("includes the body when it affects identity", () => {
    const key = createRequestKey({
      method: "POST",
      url: "/api/reviews",
      body: { comment: "hello", userAddress: "G1" },
    });
    expect(key).toContain("body=");
    expect(key).toContain("hello");
  });

  it("omits the body segment when no body is provided", () => {
    expect(createRequestKey({ method: "GET", url: "/api/reviews" })).not.toContain("body=");
  });
});

describe("stableStringify", () => {
  it("sorts object keys so key order does not change identity", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });
});

describe("buildUrlWithParams", () => {
  it("merges extra params into a relative URL", () => {
    expect(buildUrlWithParams("/api/reviews", { projectId: "p1" })).toBe(
      "/api/reviews?projectId=p1",
    );
  });
});
