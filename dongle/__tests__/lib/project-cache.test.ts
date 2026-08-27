import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  projectMetaCache,
  verificationStatusCache,
  PROJECT_CACHE_TTL_MS,
} from "@/lib/project-cache";
import type { Project } from "@/types/project";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";

// Minimal stub project for cache tests
const makeProject = (id: string): Project => ({
  id,
  name: `Project ${id}`,
  primaryCategory: "DeFi / DEX",
  description: "Test project",
  rating: 4.5,
  reviews: 10,
  createdAt: "2024-01-01T00:00:00Z",
});

describe("projectMetaCache", () => {
  beforeEach(() => {
    projectMetaCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined for an unknown key", () => {
    expect(projectMetaCache.get("nonexistent")).toBeUndefined();
  });

  it("stores and retrieves a project", () => {
    const p = makeProject("alpha");
    projectMetaCache.set("alpha", p);
    expect(projectMetaCache.get("alpha")).toEqual(p);
  });

  it("returns undefined after TTL expires", () => {
    const p = makeProject("beta");
    projectMetaCache.set("beta", p);

    // Advance past the default TTL
    vi.advanceTimersByTime(PROJECT_CACHE_TTL_MS + 1);

    expect(projectMetaCache.get("beta")).toBeUndefined();
  });

  it("still returns a value just before TTL expires", () => {
    const p = makeProject("gamma");
    projectMetaCache.set("gamma", p);

    vi.advanceTimersByTime(PROJECT_CACHE_TTL_MS - 1);

    expect(projectMetaCache.get("gamma")).toEqual(p);
  });

  it("respects a custom TTL when provided", () => {
    const p = makeProject("custom");
    projectMetaCache.set("custom", p, 5_000); // 5 s TTL

    vi.advanceTimersByTime(4_999);
    expect(projectMetaCache.get("custom")).toEqual(p);

    vi.advanceTimersByTime(2);
    expect(projectMetaCache.get("custom")).toBeUndefined();
  });

  it("getMissingKeys returns only the IDs that are absent or expired", () => {
    const p = makeProject("cached");
    projectMetaCache.set("cached", p);

    const missing = projectMetaCache.getMissingKeys(["cached", "absent"]);
    expect(missing).toEqual(["absent"]);
  });

  it("getMissingKeys treats expired entries as missing", () => {
    const p = makeProject("old");
    projectMetaCache.set("old", p);

    vi.advanceTimersByTime(PROJECT_CACHE_TTL_MS + 1);

    const missing = projectMetaCache.getMissingKeys(["old"]);
    expect(missing).toEqual(["old"]);
  });

  it("getAll returns only live entries as a plain object", () => {
    projectMetaCache.set("live", makeProject("live"));
    projectMetaCache.set("dying", makeProject("dying"), 100);

    vi.advanceTimersByTime(200);

    const all = projectMetaCache.getAll();
    expect("live" in all).toBe(true);
    expect("dying" in all).toBe(false);
  });

  it("setMany stores multiple entries at once", () => {
    const records: Record<string, Project> = {
      a: makeProject("a"),
      b: makeProject("b"),
      c: makeProject("c"),
    };
    projectMetaCache.setMany(records);

    expect(projectMetaCache.get("a")).toEqual(records.a);
    expect(projectMetaCache.get("b")).toEqual(records.b);
    expect(projectMetaCache.get("c")).toEqual(records.c);
  });

  it("delete removes a single entry", () => {
    projectMetaCache.set("del", makeProject("del"));
    projectMetaCache.delete("del");
    expect(projectMetaCache.get("del")).toBeUndefined();
  });

  it("evictExpired removes only stale entries and returns their count", () => {
    projectMetaCache.set("fresh", makeProject("fresh"));
    projectMetaCache.set("stale", makeProject("stale"), 1_000);

    vi.advanceTimersByTime(1_001);

    const evicted = projectMetaCache.evictExpired();
    expect(evicted).toBe(1);
    expect(projectMetaCache.get("fresh")).toBeDefined();
    expect(projectMetaCache.get("stale")).toBeUndefined();
  });

  it("size reflects stored entry count", () => {
    expect(projectMetaCache.size).toBe(0);
    projectMetaCache.set("x", makeProject("x"));
    expect(projectMetaCache.size).toBe(1);
    projectMetaCache.clear();
    expect(projectMetaCache.size).toBe(0);
  });
});

describe("verificationStatusCache", () => {
  beforeEach(() => {
    verificationStatusCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves a verification status", () => {
    const status: VerificationStatus = "VERIFIED";
    verificationStatusCache.set("proj-1", status);
    expect(verificationStatusCache.get("proj-1")).toBe("VERIFIED");
  });

  it("returns undefined after TTL expires", () => {
    verificationStatusCache.set("proj-2", "PENDING");
    vi.advanceTimersByTime(PROJECT_CACHE_TTL_MS + 1);
    expect(verificationStatusCache.get("proj-2")).toBeUndefined();
  });

  it("getMissingKeys is cache-aware", () => {
    verificationStatusCache.set("known", "NONE");
    expect(verificationStatusCache.getMissingKeys(["known", "unknown"])).toEqual(
      ["unknown"],
    );
  });

  it("setMany works for verification statuses", () => {
    const entries: Record<string, VerificationStatus> = {
      p1: "VERIFIED",
      p2: "REJECTED",
      p3: "NONE",
    };
    verificationStatusCache.setMany(entries);
    expect(verificationStatusCache.get("p1")).toBe("VERIFIED");
    expect(verificationStatusCache.get("p2")).toBe("REJECTED");
    expect(verificationStatusCache.get("p3")).toBe("NONE");
  });
});
