import { describe, expect, it } from "vitest";
import { saveComparisonSnapshot, getComparisonHistory, deleteComparisonHistoryEntry, buildComparisonPermalink } from "@/utils/comparison-history.util";
import type { Project } from "@/types/project";

const makeProject = (id: string, name: string, rating = 4.5): Project => ({
  id,
  name,
  primaryCategory: "DeFi / DEX",
  description: "A test project",
  rating,
  reviews: 42,
  createdAt: "2024-01-01T00:00:00Z",
  tags: ["dex", "liquidity"],
});

describe("comparison-history.util", () => {
  it("saves and loads comparison snapshots for a user", () => {
    const projects = [makeProject("p1", "Alpha"), makeProject("p2", "Beta")];
    const snapshot = saveComparisonSnapshot(projects, "wallet-1");

    expect(snapshot).not.toBeNull();
    expect(getComparisonHistory("wallet-1")).toHaveLength(1);
    expect(getComparisonHistory("wallet-1")[0].projectIds).toEqual(["p1", "p2"]);
  });

  it("enforces the 20-item history cap", () => {
    const user = "wallet-2";
    for (let index = 0; index < 25; index += 1) {
      saveComparisonSnapshot([makeProject(`p-${index}`, `Project ${index}`), makeProject(`q-${index}`, `Project ${index} B`)], user);
    }

    expect(getComparisonHistory(user)).toHaveLength(20);
  });

  it("creates shareable comparison permalinks", () => {
    expect(buildComparisonPermalink(["a", "b", "a"])) .toContain("/compare?ids=");
  });

  it("deletes saved comparison entries", () => {
    const projects = [makeProject("x1", "X1"), makeProject("x2", "X2")];
    const snapshot = saveComparisonSnapshot(projects, "wallet-3");
    deleteComparisonHistoryEntry(snapshot!.id, "wallet-3");

    expect(getComparisonHistory("wallet-3")).toHaveLength(0);
  });
});
