import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  findDuplicates,
  suggestMerge,
  executeMerge,
  restoreMerge,
  getMergeHistory,
  clearMergeHistory,
  levenshteinDistance,
  levenshteinSimilarity,
  jaccardSimilarity,
  normalizeDomain,
  normalizeRepo,
  compareContractAddresses,
} from "@/services/form-deduplication";
import type { Project } from "@/types/project";

describe("Form Deduplication & Merge System", () => {
  const mockExistingProjects: Project[] = [
    {
      id: "soroban-swap",
      name: "SorobanSwap DEX",
      primaryCategory: "DeFi / DEX",
      description: "Premier decentralized exchange built on Stellar Soroban with deep liquidity pools.",
      rating: 4.8,
      reviews: 42,
      createdAt: "2026-01-10T12:00:00Z",
      websiteUrl: "https://sorobanswap.io",
      githubUrl: "https://github.com/sorobanswap/contracts",
      domain: "sorobanswap.io",
      tags: ["defi", "dex", "amm"],
      contractAddresses: [
        "CA3D5KRYMCMQU7YOGYSTKZSDPTZE7BM7TDTW3HMWODWH7SX7QL2NCXYZ",
      ],
    },
    {
      id: "stellar-pay",
      name: "StellarPay Gateway",
      primaryCategory: "Payments",
      description: "Instant cross-border payment rails for merchants worldwide.",
      rating: 4.5,
      reviews: 18,
      createdAt: "2026-02-01T10:00:00Z",
      websiteUrl: "https://stellarpay.org",
      githubUrl: "https://github.com/stellarpay/sdk",
      domain: "stellarpay.org",
      tags: ["payments", "cross-border"],
      contractAddresses: [],
    },
  ];

  beforeEach(() => {
    clearMergeHistory();
    localStorage.clear();
  });

  describe("Similarity & Normalization Algorithms", () => {
    it("calculates Levenshtein distance and similarity accurately", () => {
      expect(levenshteinDistance("SorobanSwap", "SorobanSwap")).toBe(0);
      expect(levenshteinSimilarity("SorobanSwap", "SorobanSwap")).toBe(1.0);

      // Minor typo
      const similarity = levenshteinSimilarity("SorobanSwap", "SorobanSwapp");
      expect(similarity).toBeGreaterThan(0.9);

      // Completely different
      expect(levenshteinSimilarity("Stellar", "Ethereum")).toBeLessThan(0.3);
    });

    it("calculates Jaccard similarity for token sets", () => {
      const tokensA = ["defi", "dex", "amm"];
      const tokensB = ["dex", "amm", "yield"];
      const score = jaccardSimilarity(tokensA, tokensB);
      // intersection: dex, amm (2); union: defi, dex, amm, yield (4) -> 0.5
      expect(score).toBe(0.5);
    });

    it("normalizes domains and repository URLs properly", () => {
      expect(normalizeDomain("https://www.sorobanswap.io/app/swap")).toBe("sorobanswap.io");
      expect(normalizeDomain("sorobanswap.io")).toBe("sorobanswap.io");

      expect(normalizeRepo("https://github.com/sorobanswap/contracts.git")).toBe("github.com/sorobanswap/contracts");
      expect(normalizeRepo("github.com/sorobanswap/contracts/")).toBe("github.com/sorobanswap/contracts");
    });

    it("compares Soroban contract addresses", () => {
      const result = compareContractAddresses(
        ["CA3D5KRYMCMQU7YOGYSTKZSDPTZE7BM7TDTW3HMWODWH7SX7QL2NCXYZ"],
        ["CA3D5KRYMCMQU7YOGYSTKZSDPTZE7BM7TDTW3HMWODWH7SX7QL2NCXYZ", "CB123"],
      );
      expect(result.common.length).toBe(1);
      expect(result.similarity).toBeGreaterThan(0.4);
    });
  });

  describe("Duplicate Detection & Prevention", () => {
    it("detects exact duplicate submissions and flags prevention", () => {
      const result = findDuplicates(
        {
          name: "SorobanSwap DEX",
          websiteUrl: "https://sorobanswap.io",
          githubUrl: "https://github.com/sorobanswap/contracts",
        },
        mockExistingProjects,
      );

      expect(result.hasExactDuplicate).toBe(true);
      expect(result.exactMatch).toBeDefined();
      expect(result.exactMatch?.project.id).toBe("soroban-swap");
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("detects potential/likely duplicates with similar names or same domain", () => {
      const result = findDuplicates(
        {
          name: "Soroban Swap Protocol",
          websiteUrl: "https://sorobanswap.io",
        },
        mockExistingProjects,
      );

      expect(result.hasPotentialDuplicates).toBe(true);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.candidates[0].project.id).toBe("soroban-swap");
      expect(result.candidates[0].severity).toBeDefined();
    });

    it("ignores different projects", () => {
      const result = findDuplicates(
        {
          name: "Anchor Protocol Alpha",
          websiteUrl: "https://anchoralp.net",
          githubUrl: "https://github.com/anchor/core",
        },
        mockExistingProjects,
      );

      expect(result.hasExactDuplicate).toBe(false);
      expect(result.hasPotentialDuplicates).toBe(false);
      expect(result.candidates.length).toBe(0);
    });
  });

  describe("Merge Suggestions & Field Resolution", () => {
    it("generates smart merge suggestions with combined tags and longest description", () => {
      const target = mockExistingProjects[0];
      const source: Partial<Project> = {
        name: "SorobanSwap DEX Official",
        description: "Premier decentralized exchange built on Stellar Soroban with deep liquidity pools, automated market making, and multi-asset staking rewards.",
        tags: ["amm", "staking", "yield-farming"],
        docsUrl: "https://docs.sorobanswap.io",
      };

      const suggestion = suggestMerge(target, source);

      expect(suggestion.targetProjectId).toBe("soroban-swap");
      expect(suggestion.proposedRecord).toBeDefined();

      // Description should resolve to the longer source description
      expect(suggestion.proposedRecord.description).toBe(source.description);

      // Tags should be combined union
      expect(suggestion.proposedRecord.tags).toEqual(
        expect.arrayContaining(["defi", "dex", "amm", "staking", "yield-farming"]),
      );

      // DocsUrl should be filled from source since target was empty
      expect(suggestion.proposedRecord.docsUrl).toBe("https://docs.sorobanswap.io");
    });
  });

  describe("Execute Merge & Rollback / Restoration", () => {
    it("executes merge, preserves history snapshot, and supports full rollback", () => {
      const target = mockExistingProjects[0];
      const source: Project = {
        ...mockExistingProjects[1],
        id: "duplicate-target-id",
        name: "SorobanSwap Duplicate",
        description: "An alternate submission of SorobanSwap",
      };

      // 1. Execute merge
      const mergeResult = executeMerge({
        targetProject: target,
        sourceProject: source,
        mergedBy: "GADMINWALLET1234567890",
      });

      expect(mergeResult.success).toBe(true);
      expect(mergeResult.record.id).toMatch(/^merge_/);
      expect(mergeResult.record.status).toBe("active");
      expect(mergeResult.record.sourceSnapshot).toEqual(source);
      expect(mergeResult.record.targetSnapshot).toEqual(target);

      // Verify in history
      const history = getMergeHistory();
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(mergeResult.record.id);

      // 2. Restore merge (rollback)
      const restoreResult = restoreMerge({
        mergeId: mergeResult.record.id,
        restoredBy: "GADMINWALLET1234567890",
        reason: "Accidental merge rollback",
      });

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredRecord?.status).toBe("restored");
      expect(restoreResult.restoredRecord?.restoredAt).toBeDefined();

      // Subsequent restore attempt should reject
      const secondRestore = restoreMerge({
        mergeId: mergeResult.record.id,
        restoredBy: "GADMINWALLET1234567890",
      });
      expect(secondRestore.success).toBe(false);
      expect(secondRestore.error).toContain("already restored");
    });
  });
});
