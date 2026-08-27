import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { batchFetchProjects, BATCH_SIZE } from "@/services/project/batch-fetch";
import { batchFetchVerificationStatuses } from "@/services/stellar/batch-verification";
import { projectMetaCache, verificationStatusCache } from "@/lib/project-cache";
import { registry } from "@/services/data-access/registry";
import { MockProjectRepository } from "@/services/data-access/MockProjectRepository";
import type { Project } from "@/types/project";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";

// ─── Soroban mock at top level (required for vi.mock hoisting) ───────────────

const mockGetVerificationStatus = vi.fn(
  async (id: string): Promise<VerificationStatus> => {
    const map: Record<string, VerificationStatus> = {
      alpha: "VERIFIED",
      beta: "PENDING",
      gamma: "NONE",
    };
    return map[id] ?? "NONE";
  },
);

vi.mock("@/services/stellar/soroban.service", () => ({
  sorobanService: {
    get getVerificationStatus() {
      return mockGetVerificationStatus;
    },
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeProject = (id: string): Project => ({
  id,
  name: `Project ${id}`,
  primaryCategory: "DeFi / DEX",
  description: "Test",
  rating: 4,
  reviews: 5,
  createdAt: "2024-01-01T00:00:00Z",
});

const PROJECTS = ["alpha", "beta", "gamma"].map(makeProject);

// ─── batchFetchProjects ──────────────────────────────────────────────────────

describe("batchFetchProjects", () => {
  beforeEach(() => {
    registry.setProjectRepository(new MockProjectRepository(PROJECTS));
    projectMetaCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    registry.setProjectRepository(new MockProjectRepository());
    vi.useRealTimers();
  });

  it("returns null for unknown IDs", async () => {
    const result = await batchFetchProjects(["nonexistent"]);
    expect(result["nonexistent"]).toBeNull();
  });

  it("fetches known projects by ID", async () => {
    const result = await batchFetchProjects(["alpha", "beta"]);
    expect(result["alpha"]?.name).toBe("Project alpha");
    expect(result["beta"]?.name).toBe("Project beta");
  });

  it("returns an empty record for an empty input", async () => {
    const result = await batchFetchProjects([]);
    expect(result).toEqual({});
  });

  it("populates the cache after fetching", async () => {
    expect(projectMetaCache.get("gamma")).toBeUndefined();

    await batchFetchProjects(["gamma"]);

    expect(projectMetaCache.get("gamma")?.id).toBe("gamma");
  });

  it("serves subsequent calls from cache without hitting the repository", async () => {
    // First call — populates cache
    await batchFetchProjects(["alpha"]);

    // Spy on the repository's getById — it should NOT be called a second time
    const spy = vi.spyOn(registry.projects, "getById");
    const result = await batchFetchProjects(["alpha"]);

    expect(spy).not.toHaveBeenCalled();
    expect(result["alpha"]?.id).toBe("alpha");
  });

  it("bypassCache forces a fresh fetch even when cache is warm", async () => {
    // Warm cache
    await batchFetchProjects(["alpha"]);

    const spy = vi.spyOn(registry.projects, "getById");
    await batchFetchProjects(["alpha"], true);

    expect(spy).toHaveBeenCalledWith("alpha");
  });

  it("splits large ID lists into chunks of BATCH_SIZE", async () => {
    const manyProjects = Array.from({ length: BATCH_SIZE + 1 }, (_, i) =>
      makeProject(`p${i}`),
    );
    registry.setProjectRepository(new MockProjectRepository(manyProjects));

    const getByIdSpy = vi.spyOn(registry.projects, "getById");

    const ids = manyProjects.map((p) => p.id);
    await batchFetchProjects(ids, true);

    expect(getByIdSpy).toHaveBeenCalledTimes(BATCH_SIZE + 1);
  });

  it("handles partial failures gracefully — returns null for failed IDs", async () => {
    vi.spyOn(registry.projects, "getById").mockImplementation(async (id) => {
      if (id === "beta") throw new Error("RPC error");
      return PROJECTS.find((p) => p.id === id) ?? null;
    });

    const result = await batchFetchProjects(["alpha", "beta"]);
    expect(result["alpha"]?.id).toBe("alpha");
    expect(result["beta"]).toBeNull();
  });
});

// ─── batchFetchVerificationStatuses ─────────────────────────────────────────

describe("batchFetchVerificationStatuses", () => {
  beforeEach(() => {
    verificationStatusCache.clear();
    vi.useFakeTimers();
    mockGetVerificationStatus.mockReset();
    mockGetVerificationStatus.mockImplementation(
      async (id: string): Promise<VerificationStatus> => {
        const map: Record<string, VerificationStatus> = {
          alpha: "VERIFIED",
          beta: "PENDING",
          gamma: "NONE",
        };
        return map[id] ?? "NONE";
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns an empty record for an empty input", async () => {
    const result = await batchFetchVerificationStatuses([]);
    expect(result).toEqual({});
  });

  it("fetches statuses for a list of project IDs", async () => {
    const result = await batchFetchVerificationStatuses([
      "alpha",
      "beta",
      "gamma",
    ]);
    expect(result["alpha"]).toBe("VERIFIED");
    expect(result["beta"]).toBe("PENDING");
    expect(result["gamma"]).toBe("NONE");
  });

  it("populates the verification cache after fetching", async () => {
    expect(verificationStatusCache.get("alpha")).toBeUndefined();

    await batchFetchVerificationStatuses(["alpha"]);

    expect(verificationStatusCache.get("alpha")).toBe("VERIFIED");
  });

  it("serves subsequent calls from cache without calling the service", async () => {
    // Prime the cache
    await batchFetchVerificationStatuses(["alpha"]);

    // Clear call count but keep implementation
    mockGetVerificationStatus.mockClear();

    const result = await batchFetchVerificationStatuses(["alpha"]);

    expect(mockGetVerificationStatus).not.toHaveBeenCalled();
    expect(result["alpha"]).toBe("VERIFIED");
  });

  it("respects AbortSignal — returns immediately if already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await batchFetchVerificationStatuses(
      ["alpha"],
      controller.signal,
    );

    // Should return without fetching since already aborted
    expect(result["alpha"]).toBeUndefined();
  });

  it("falls back to NONE for IDs where the service rejects", async () => {
    mockGetVerificationStatus.mockRejectedValueOnce(new Error("RPC error"));

    const result = await batchFetchVerificationStatuses(["alpha"]);
    expect(result["alpha"]).toBe("NONE");
  });

  it("bypassCache forces re-fetch even for cached IDs", async () => {
    // Prime cache
    await batchFetchVerificationStatuses(["beta"]);
    mockGetVerificationStatus.mockClear();

    await batchFetchVerificationStatuses(["beta"], undefined, true);

    expect(mockGetVerificationStatus).toHaveBeenCalledWith("beta", undefined);
  });
});
