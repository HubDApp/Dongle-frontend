/**
 * Unit tests for Redis-backed API rate limiting (Issue #729).
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  AUTHENTICATED_MULTIPLIER,
  classifyRequest,
  createRateLimiter,
  DEFAULT_RATE_LIMIT_CONFIG,
  RATE_LIMIT_HEADERS,
  resetRateLimitStore,
  type RateLimitConfig,
} from "@/services/rate-limit";
import { applyRateLimitHeaders, rateLimitResponse } from "@/services/rate-limit/headers";

afterEach(() => {
  resetRateLimitStore();
});

function tinyConfig(): RateLimitConfig {
  return {
    read: { limit: 2, windowSeconds: 60, authenticatedMultiplier: AUTHENTICATED_MULTIPLIER },
    write: { limit: 1, windowSeconds: 60, authenticatedMultiplier: AUTHENTICATED_MULTIPLIER },
    search: { limit: 3, windowSeconds: 60, authenticatedMultiplier: AUTHENTICATED_MULTIPLIER },
    admin: { limit: 4, windowSeconds: 60, authenticatedMultiplier: AUTHENTICATED_MULTIPLIER },
  };
}

describe("default config", () => {
  it("matches the issue spec quotas", () => {
    expect(DEFAULT_RATE_LIMIT_CONFIG.read.limit).toBe(100);
    expect(DEFAULT_RATE_LIMIT_CONFIG.write.limit).toBe(10);
    expect(DEFAULT_RATE_LIMIT_CONFIG.search.limit).toBe(30);
    expect(DEFAULT_RATE_LIMIT_CONFIG.admin.limit).toBe(50);
  });

  it("applies a higher authenticated multiplier", () => {
    for (const quota of Object.values(DEFAULT_RATE_LIMIT_CONFIG)) {
      expect(quota.authenticatedMultiplier).toBeGreaterThan(1);
    }
  });
});

describe("classifyRequest", () => {
  it("classifies admin paths as admin", () => {
    expect(classifyRequest("/api/admin/auth", "POST")).toBe("admin");
    expect(classifyRequest("/api/admin/verify", "GET")).toBe("admin");
  });

  it("classifies search/discover paths as search", () => {
    expect(classifyRequest("/api/projects", "GET")).toBe("search");
    expect(classifyRequest("/api/search", "GET")).toBe("search");
    expect(classifyRequest("/discover", "GET")).toBe("search");
  });

  it("classifies GETs as read", () => {
    expect(classifyRequest("/api/reviews", "GET")).toBe("read");
  });

  it("classifies mutations as write", () => {
    expect(classifyRequest("/api/reviews", "POST")).toBe("write");
    expect(classifyRequest("/api/reviews/123", "DELETE")).toBe("write");
  });
});

describe("createRateLimiter", () => {
  it("allows up to the read limit then blocks per IP", async () => {
    const limiter = createRateLimiter({ config: tinyConfig(), hashIp: (ip) => ip });
    const identity = { ip: "1.2.3.4" };

    expect((await limiter.check(identity, "read")).allowed).toBe(true);
    expect((await limiter.check(identity, "read")).allowed).toBe(true);

    const blocked = await limiter.check(identity, "read");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("buckets different IPs independently", async () => {
    const limiter = createRateLimiter({ config: tinyConfig(), hashIp: (ip) => ip });

    expect((await limiter.check({ ip: "10.0.0.1" }, "write")).allowed).toBe(true);
    expect((await limiter.check({ ip: "10.0.0.1" }, "write")).allowed).toBe(false);
    expect((await limiter.check({ ip: "10.0.0.2" }, "write")).allowed).toBe(true);
  });

  it("gives authenticated subjects a higher limit", async () => {
    const limiter = createRateLimiter({ config: tinyConfig(), hashIp: (ip) => ip });
    const expected = 2 * AUTHENTICATED_MULTIPLIER;

    let allowedCount = 0;
    for (let i = 0; i < expected; i++) {
      const result = await limiter.check({ ip: "9.9.9.9", subject: "admin" }, "read");
      if (result.allowed) allowedCount++;
    }
    expect(allowedCount).toBe(expected);

    const blocked = await limiter.check({ ip: "9.9.9.9", subject: "admin" }, "read");
    expect(blocked.allowed).toBe(false);
    expect(blocked.authenticated).toBe(true);
    expect(blocked.limit).toBe(expected);
  });

  it("reports reset time and retry-after consistently", async () => {
    const limiter = createRateLimiter({ config: tinyConfig(), hashIp: (ip) => ip });
    await limiter.check({ ip: "5.5.5.5" }, "write");
    const blocked = await limiter.check({ ip: "5.5.5.5" }, "write");
    expect(blocked.resetAt).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });
});

describe("header helpers", () => {
  it("sets rate-limit headers on an allowed response", async () => {
    const limiter = createRateLimiter({ config: tinyConfig(), hashIp: (ip) => ip });
    const result = await limiter.check({ ip: "1.1.1.1" }, "read");

    const response = applyRateLimitHeaders(new Response("ok"), result);
    expect(response.headers.get(RATE_LIMIT_HEADERS.limit)).toBe(String(result.limit));
    expect(response.headers.get(RATE_LIMIT_HEADERS.remaining)).toBe(
      String(result.remaining),
    );
    expect(response.headers.get(RATE_LIMIT_HEADERS.reset)).toBe(String(result.resetAt));
    expect(response.headers.get(RATE_LIMIT_HEADERS.retryAfter)).toBeNull();
  });

  it("builds a 429 response with Retry-After when blocked", async () => {
    const limiter = createRateLimiter({ config: tinyConfig(), hashIp: (ip) => ip });
    await limiter.check({ ip: "2.2.2.2" }, "write");
    const blocked = await limiter.check({ ip: "2.2.2.2" }, "write");

    const response = rateLimitResponse(blocked);
    expect(response.status).toBe(429);
    expect(response.headers.get(RATE_LIMIT_HEADERS.retryAfter)).toBe(
      String(blocked.retryAfterSeconds),
    );
    const body = await response.json();
    expect(body.error).toBe("Too Many Requests");
  });
});
