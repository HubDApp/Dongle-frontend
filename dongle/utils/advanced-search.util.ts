import type { Project } from "@/types/project";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";
import type { AdvancedSearchFilters, SearchPreset, SearchPresetId } from "@/types/search";
import { projectService } from "@/services/project/project.service";

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

export function getPresetById(id: SearchPresetId): SearchPreset | undefined {
  return SEARCH_PRESETS.find((p) => p.id === id);
}

function withinDateRange(isoDate: string, from?: string, to?: string): boolean {
  const time = new Date(isoDate).getTime();
  if (from && time < new Date(from).getTime()) return false;
  if (to && time > new Date(to).getTime()) return false;
  return true;
}

export function applyAdvancedFilters(
  projects: Project[],
  filters: AdvancedSearchFilters,
  verificationStatuses: Record<string, VerificationStatus> = {},
): Project[] {
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

  return params;
}

export function decodeSearchFiltersFromParams(
  searchParams: URLSearchParams,
): AdvancedSearchFilters {
  const presetRaw = searchParams.get("preset");
  const preset =
    presetRaw === "verified-defi" ||
    presetRaw === "high-rated-games" ||
    presetRaw === "recently-updated"
      ? presetRaw
      : undefined;

  const sortRaw = searchParams.get("sort");
  const sortBy =
    sortRaw === "newest" || sortRaw === "popular" || sortRaw === "rating"
      ? sortRaw
      : "rating";

  const verificationRaw = searchParams.get("verification");
  const verification =
    verificationRaw === "VERIFIED" ||
    verificationRaw === "PENDING" ||
    verificationRaw === "REJECTED" ||
    verificationRaw === "NONE"
      ? verificationRaw
      : "ALL";

  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const base: AdvancedSearchFilters = {
    query: searchParams.get("q") ?? "",
    categories: (searchParams.get("categories") ?? "")
      .split(",")
      .filter(Boolean),
    tags: (searchParams.get("tags") ?? "").split(",").filter(Boolean),
    ratingMin: searchParams.get("ratingMin")
      ? Number(searchParams.get("ratingMin"))
      : undefined,
    ratingMax: searchParams.get("ratingMax")
      ? Number(searchParams.get("ratingMax"))
      : undefined,
    verification,
    ownerAddress: searchParams.get("owner") ?? undefined,
    createdFrom: searchParams.get("createdFrom") ?? undefined,
    createdTo: searchParams.get("createdTo") ?? undefined,
    preset,
    sortBy,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };

  if (preset) {
    const presetDef = getPresetById(preset);
    if (presetDef) {
      return {
        ...base,
        ...presetDef.filters,
        categories: presetDef.filters.categories ?? base.categories,
        tags: base.tags,
        query: base.query,
        page: base.page,
        preset,
        sortBy: presetDef.filters.sortBy ?? base.sortBy,
        verification: presetDef.filters.verification ?? base.verification,
        ratingMin: presetDef.filters.ratingMin ?? base.ratingMin,
        ratingMax: presetDef.filters.ratingMax ?? base.ratingMax,
      };
    }
  }

  return base;
}

export function getSearchAutocompleteSuggestions(query: string): {
  projectNames: string[];
  categories: string[];
} {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { projectNames: [], categories: [] };
  }

  const projects = projectService.getDiscoverableProjects();
  const projectNames = projects
    .filter((p) => p.name.toLowerCase().includes(q))
    .slice(0, 8)
    .map((p) => p.name);

  const categories = projectService
    .getCategories()
    .filter((c) => c !== "All" && c.toLowerCase().includes(q))
    .slice(0, 5);

  return { projectNames, categories };
}
