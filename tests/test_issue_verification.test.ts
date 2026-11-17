import { applyAdvancedFilters, encodeSearchFiltersToParams, decodeSearchFiltersFromParams } from "../dongle/utils/advanced-search.util";
import type { Project } from "../dongle/types/project";
import type { VerificationStatus } from "../dongle/components/projects/VerificationBadge";
import type { AdvancedSearchFilters } from "../dongle/types/search";

/**
 * Mock project service – only the methods used by `applyAdvancedFilters` are
 * stubbed. In the real app these are provided by the actual service layer.
 */
jest.mock("../dongle/services/project/project.service", () => ({
  projectService: {
    searchProjects: (q: string) => mockProjects.filter((p) => p.name.includes(q)),
    sortProjects: (list: Project[], sortBy?: string) => {
      if (sortBy === "newest") {
        return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      // Default: no sorting change
      return list;
    },
  },
}));

// ---------------------------------------------------------------------------
// Sample data used across the test suite.
// ---------------------------------------------------------------------------
const mockProjects: Project[] = [
  {
    id: "1",
    name: "Alpha",
    primaryCategory: "DeFi / DEX",
    rating: 4.5,
    tags: ["stablecoin"],
    ownerAddress: "GABCDEF1234567890",
    createdAt: new Date().toISOString(),
    contractAddress: "0xAAA111",
    auditStatus: "passed",
    bugBounty: true,
  },
  {
    id: "2",
    name: "Beta",
    primaryCategory: "Gaming / NFT",
    rating: 3.8,
    tags: ["collectible"],
    ownerAddress: "GXYZ1234567890",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    contractAddress: "0xBBB222",
    auditStatus: "pending",
    bugBounty: false,
  },
  {
    id: "3",
    name: "Gamma",
    primaryCategory: "DeFi / DEX",
    rating: 5,
    tags: [],
    ownerAddress: "GABCDEF1234567890",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(), // 120 days ago
    contractAddress: "0xAAA111",
    auditStatus: "failed",
    bugBounty: true,
  },
];

const verificationMap: Record<string, VerificationStatus> = {
  "1": "VERIFIED",
  "2": "NONE",
  "3": "VERIFIED",
};

describe("applyAdvancedFilters – new filter support", () => {
  test("filters by contract address", () => {
    const filters: AdvancedSearchFilters = {
      query: "",
      categories: [],
      tags: [],
      ratingMin: undefined,
      ratingMax: undefined,
      verification: "ALL",
      ownerAddress: "",
      createdFrom: undefined,
      createdTo: undefined,
      preset: undefined,
      sortBy: "rating",
      page: 1,
      contractAddress: "0xAAA111",
      auditStatus: "",
      bugBounty: undefined,
    };
    const result = applyAdvancedFilters(mockProjects, filters, verificationMap);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id).sort()).toEqual(["1", "3"].sort());
  });

  test("filters by audit status", () => {
    const filters: AdvancedSearchFilters = {
      query: "",
      categories: [],
      tags: [],
      ratingMin: undefined,
      ratingMax: undefined,
      verification: "ALL",
      ownerAddress: "",
      createdFrom: undefined,
      createdTo: undefined,
      preset: undefined,
      sortBy: "rating",
      page: 1,
      contractAddress: "",
      auditStatus: "passed",
      bugBounty: undefined,
    };
    const result = applyAdvancedFilters(mockProjects, filters, verificationMap);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  test("filters by bug bounty flag", () => {
    const filters: AdvancedSearchFilters = {
      query: "",
      categories: [],
      tags: [],
      ratingMin: undefined,
      ratingMax: undefined,
      verification: "ALL",
      ownerAddress: "",
      createdFrom: undefined,
      createdTo: undefined,
      preset: undefined,
      sortBy: "rating",
      page: 1,
      contractAddress: "",
      auditStatus: "",
      bugBounty: true,
    };
    const result = applyAdvancedFilters(mockProjects, filters, verificationMap);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id).sort()).toEqual(["1", "3"].sort());
  });
});

describe("encode/decode round‑trip includes new fields", () => {
  test("contract, auditStatus and bugBounty survive encode/decode", () => {
    const original: Partial<AdvancedSearchFilters> = {
      contractAddress: "0xAAA111",
      auditStatus: "passed",
      bugBounty: true,
    };
    const params = encodeSearchFiltersToParams(original);
    const urlSearch = new URLSearchParams(params as any);
    const decoded = decodeSearchFiltersFromParams(urlSearch);
    expect(decoded.contractAddress).toBe("0xAAA111");
    expect(decoded.auditStatus).toBe("passed");
    expect(decoded.bugBounty).toBe(true);
  });
});
