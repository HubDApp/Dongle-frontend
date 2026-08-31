import { describe, it, expect, beforeEach } from "vitest";
import { savedSearchService } from "@/services/search/saved-search.service";
import { MAX_SAVED_SEARCHES } from "@/constants/limits";

const WALLET = "GABC123";

describe("savedSearchService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and lists searches", () => {
    const result = savedSearchService.saveSearch(WALLET, "Verified DeFi", {
      query: "",
      categories: ["DeFi / DEX"],
      tags: [],
      verification: "VERIFIED",
      sortBy: "rating",
    });

    expect(result.success).toBe(true);
    expect(savedSearchService.getSavedSearches(WALLET)).toHaveLength(1);
  });

  it("enforces max saved searches", () => {
    for (let i = 0; i < MAX_SAVED_SEARCHES; i += 1) {
      savedSearchService.saveSearch(WALLET, `Search ${i}`, {
        query: "",
        categories: [],
        tags: [],
        verification: "ALL",
        sortBy: "rating",
      });
    }

    const blocked = savedSearchService.saveSearch(WALLET, "Overflow", {
      query: "",
      categories: [],
      tags: [],
      verification: "ALL",
      sortBy: "rating",
    });

    expect(blocked.success).toBe(false);
  });
});
