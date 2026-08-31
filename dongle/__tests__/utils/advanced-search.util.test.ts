import { describe, it, expect } from "vitest";
import {
  applyAdvancedFilters,
  decodeSearchFiltersFromParams,
  encodeSearchFiltersToParams,
  getSearchAutocompleteSuggestions,
} from "@/utils/advanced-search.util";
import { projectService } from "@/services/project/project.service";

describe("advanced-search.util", () => {
  it("encodes and decodes URL filters", () => {
    const encoded = encodeSearchFiltersToParams({
      query: "stellar",
      categories: ["DeFi / DEX"],
      ratingMin: 4,
      verification: "VERIFIED",
      sortBy: "newest",
      page: 2,
    });

    const params = new URLSearchParams(encoded as Record<string, string>);
    const decoded = decodeSearchFiltersFromParams(params);
    expect(decoded.query).toBe("stellar");
    expect(decoded.categories).toEqual(["DeFi / DEX"]);
    expect(decoded.ratingMin).toBe(4);
    expect(decoded.verification).toBe("VERIFIED");
    expect(decoded.sortBy).toBe("newest");
    expect(decoded.page).toBe(2);
  });

  it("filters by owner address", () => {
    const projects = projectService.getDiscoverableProjects();
    const owner = projects.find((p) => p.ownerAddress)?.ownerAddress;
    if (!owner) return;

    const filtered = applyAdvancedFilters(projects, {
      query: "",
      categories: [],
      tags: [],
      verification: "ALL",
      ownerAddress: owner,
      sortBy: "rating",
      page: 1,
    });

    expect(filtered.every((p) => p.ownerAddress === owner)).toBe(true);
  });

  it("returns autocomplete suggestions", () => {
    const suggestions = getSearchAutocompleteSuggestions("de");
    expect(suggestions.projectNames.length + suggestions.categories.length).toBeGreaterThan(0);
  });
});
