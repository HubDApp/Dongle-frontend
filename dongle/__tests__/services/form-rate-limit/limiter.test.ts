/**
 * Unit tests for form rate limiting (Issue #554).
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  createCustomConfig,
  createRateLimiter,
  formatDuration,
  resetRateLimitStore,
} from "@/services/form-rate-limit";

afterEach(() => {
  resetRateLimitStore();
});

describe("formatDuration", () => {
  it("formats seconds, minutes, and hours", () => {
    expect(formatDuration(1)).toBe("1 second");
    expect(formatDuration(45)).toBe("45 seconds");
    expect(formatDuration(120)).toBe("2 minutes");
    expect(formatDuration(7200)).toBe("2 hours");
  });
});

describe("createRateLimiter", () => {
  it("limits submissions per IP and resets after the window", () => {
    const limiter = createRateLimiter(
      createCustomConfig({
        perIp: { limit: 2, windowMs: 1000 },
        perUser: { limit: 10, windowMs: 1000 },
      }),
    );

    const identity = { formId: "contact", ip: "1.2.3.4" };
    const t0 = 1_000_000;

    expect(limiter.consume(identity, t0).allowed).toBe(true);
    expect(limiter.consume(identity, t0 + 10).allowed).toBe(true);

    const blocked = limiter.consume(identity, t0 + 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.scope).toBe("ip");
    expect(blocked.message).toMatch(/network/i);
    expect(blocked.remaining).toBe(0);

    const afterReset = limiter.consume(identity, t0 + 1001);
    expect(afterReset.allowed).toBe(true);
  });

  it("limits submissions per user independently", () => {
    const limiter = createRateLimiter(
      createCustomConfig({
        perIp: { limit: 50, windowMs: 60_000 },
        perUser: { limit: 1, windowMs: 60_000 },
      }),
    );

    const first = limiter.consume(
      { formId: "review", ip: "9.9.9.9", userId: "wallet-a" },
      5_000,
    );
    expect(first.allowed).toBe(true);

    const second = limiter.consume(
      { formId: "review", ip: "9.9.9.9", userId: "wallet-a" },
      5_100,
    );
    expect(second.allowed).toBe(false);
    expect(second.scope).toBe("user");
    expect(second.message).toMatch(/submission limit/i);

    // Different user on same IP is still allowed
    const other = limiter.consume(
      { formId: "review", ip: "9.9.9.9", userId: "wallet-b" },
      5_200,
    );
    expect(other.allowed).toBe(true);
  });

  it("supports configurable per-form overrides", () => {
    const limiter = createRateLimiter(
      createCustomConfig({
        perIp: { limit: 100, windowMs: 60_000 },
        perUser: { limit: 100, windowMs: 60_000 },
        formOverrides: {
          "strict-form": {
            perIp: { limit: 1, windowMs: 60_000 },
          },
        },
      }),
    );

    expect(
      limiter.consume({ formId: "strict-form", ip: "8.8.8.8" }, 10).allowed,
    ).toBe(true);
    expect(
      limiter.consume({ formId: "strict-form", ip: "8.8.8.8" }, 20).allowed,
    ).toBe(false);
  });
});
