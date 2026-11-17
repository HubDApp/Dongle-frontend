import type { Project } from "@/types/project";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";
import type { AdvancedSearchFilters, SearchPreset, SearchPresetId } from "@/types/search";
import { projectService } from "@/services/project/project.service";

/**
 * Predefined search presets used throughout the UI.
 * Each preset maps to a set of filter criteria that can be applied
 * via {@link applyAdvancedFilters}.
 */
export const SEARCH_PRESETS: SearchPreset[] = [
  {
    id: "verified-defi",
    label: "Verified DeFi",
    description: "Verified DeFi / DEX projects",
    filters: {
      categories: ["DeFi / DEX"],
      verification: "VERIFIED",
    },
  },
  {
    id: "high-rated-games",
    label: "High-rated Games",
    description: "Gaming / NFT projects rated 4+ stars",
    filters: {
      categories: ["Gaming / NFT"],
      ratingMin: 4,
    },
  },
  {
    id: "recently-updated",
    label: "Recently Updated",
    description: "Projects created in the last 90 days",
    filters: {
      sortBy: "newest",
    },
  },
];

/** Return a preset by its identifier. */
export function getPresetById(id: SearchPresetId): SearchPreset | undefined {
  return SEARCH_PRESETS.find((p) => p.id === id);
}

/**
 * Helper that checks whether a given ISO date string falls within an optional
 * `from` / `to` range. Used for the `createdFrom` and `createdTo` filters.
 */
function withinDateRange(isoDate: string, from?: string, to?: string): boolean {
  const time = new Date(isoDate).getTime();
  if (from && time < new Date(from).getTime()) return false;
  if (to && time > new Date(to).getTime()) return false;
  return true;
}

/**
 * Apply a set of advanced search filters to a list of projects.
 *
 * The function is pure – it never mutates the original `projects` array.
 * All filters are applied in a short‑circuit fashion; if a filter is not
 * present in `filters` it is simply ignored.
 *
 * New filter support added:
 *   - `contractAddress` – exact match on the project's contract address.
 *   - `auditStatus` – exact match on the project's audit status string.
 *   - `bugBounty` – boolean flag indicating the project offers a bug bounty.
 */
export function applyAdvancedFilters(
  projects: Project[],
  filters: AdvancedSearchFilters,
  verificationStatuses: Record<string, VerificationStatus> = {},
): Project[] {
  // Start with either a full‑text search or the original list.
  let result = filters.query
    ? projectService.searchProjects(filters.query)
    : [...projects];

  if (filters.categories.length > 0) {
    result = result.filter((p) => filters.categories.includes(p.primaryCategory));
  }

  if (filters.tags.length > 0) {
    result = result.filter((p) => filters.tags.every((t) => p.tags?.includes(t)));
  }

  if (filters.ratingMin !== undefined) {
    result = result.filter((p) => p.rating >= filters.ratingMin!);
  }

  if (filters.ratingMax !== undefined) {
    result = result.filter((p) => p.rating <= filters.ratingMax!);
  }

  if (filters.verification !== "ALL") {
    result = result.filter(
      (p) => (verificationStatuses[p.id] ?? "NONE") === filters.verification,
    );
  }

  if (filters.ownerAddress?.trim()) {
    const owner = filters.ownerAddress.trim();
    result = result.filter((p) => p.ownerAddress?.trim() === owner);
  }

  // --- NEW FILTERS -------------------------------------------------------
  if (filters.contractAddress?.trim()) {
    const addr = filters.contractAddress.trim();
    result = result.filter((p) => p.contractAddress?.trim() === addr);
  }

  if (filters.auditStatus?.trim()) {
    const status = filters.auditStatus.trim();
    result = result.filter((p) => p.auditStatus?.trim() === status);
  }

  if (filters.bugBounty !== undefined) {
    // `bugBounty` is a boolean flag – true means the project must have a bounty.
    result = result.filter((p) => Boolean(p.bugBounty) === Boolean(filters.bugBounty));
  }
  // -----------------------------------------------------------------------

  if (filters.createdFrom || filters.createdTo) {
    result = result.filter((p) =>
      withinDateRange(p.createdAt, filters.createdFrom, filters.createdTo),
    );
  }

  if (filters.preset === "recently-updated") {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    result = result.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
  }

  return projectService.sortProjects(result, filters.sortBy);
}

/**
 * Encode a partial filter object into a plain‑object suitable for URL query
 * parameters. New fields (`contract`, `auditStatus`, `bugBounty`) are added.
 */
export function encodeSearchFiltersToParams(
  filters: Partial<AdvancedSearchFilters>,
): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.query) params.q = filters.query;
  if (filters.categories?.length) params.categories = filters.categories.join(",");
  if (filters.tags?.length) params.tags = filters.tags.join(",");
  if (filters.ratingMin !== undefined) params.ratingMin = String(filters.ratingMin);
  if (filters.ratingMax !== undefined) params.ratingMax = String(filters.ratingMax);
  if (filters.verification && filters.verification !== "ALL") {
    params.verification = filters.verification;
  }
  if (filters.ownerAddress?.trim()) params.owner = filters.ownerAddress.trim();
  if (filters.createdFrom) params.createdFrom = filters.createdFrom;
  if (filters.createdTo) params.createdTo = filters.createdTo;
  if (filters.preset) params.preset = filters.preset;
  if (filters.sortBy && filters.sortBy !== "rating") params.sort = filters.sortBy;
  if (filters.page && filters.page > 1) params.page = String(filters.page);

  // New filter encodings ---------------------------------------------------
  if (filters.contractAddress?.trim()) params.contract = filters.contractAddress.trim();
  if (filters.auditStatus?.trim()) params.auditStatus = filters.auditStatus.trim();
  if (filters.bugBounty !== undefined) params.bugBounty = String(filters.bugBounty);
  // -----------------------------------------------------------------------

  return params;
}

/**
 * Decode URL search parameters back into an {@link AdvancedSearchFilters}
 * object. Missing parameters fall back to sensible defaults defined by the
 * type definition.
 */
export function decodeSearchFiltersFromParams(
  searchParams: URLSearchParams,
): AdvancedSearchFilters {
  const filters: AdvancedSearchFilters = {
    query: searchParams.get("q") ?? "",
    categories: searchParams.get("categories")?.split(",") ?? [],
    tags: searchParams.get("tags")?.split(",") ?? [],
    ratingMin: searchParams.get("ratingMin") ? Number(searchParams.get("ratingMin")) : undefined,
    ratingMax: searchParams.get("ratingMax") ? Number(searchParams.get("ratingMax")) : undefined,
    verification: (searchParams.get("verification") as VerificationStatus) ?? "ALL",
    ownerAddress: searchParams.get("owner") ?? "",
    createdFrom: searchParams.get("createdFrom") ?? undefined,
    createdTo: searchParams.get("createdTo") ?? undefined,
    preset: (searchParams.get("preset") as SearchPresetId) ?? undefined,
    sortBy: (searchParams.get("sort") as AdvancedSearchFilters["sortBy"]) ?? "rating",
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    // New fields -----------------------------------------------------------
    contractAddress: searchParams.get("contract") ?? "",
    auditStatus: searchParams.get("auditStatus") ?? "",
    bugBounty: searchParams.get("bugBounty")
      ? searchParams.get("bugBounty") === "true"
      : undefined,
    // ---------------------------------------------------------------------
  };

  return filters;
}
