import type { VerificationStatus } from "@/components/projects/VerificationBadge";

export type SearchPresetId =
  | "verified-defi"
  | "high-rated-games"
  | "recently-updated";

export interface AdvancedSearchFilters {
  query: string;
  categories: string[];
  tags: string[];
  ratingMin?: number;
  ratingMax?: number;
  verification: VerificationStatus | "ALL";
  ownerAddress?: string;
  createdFrom?: string;
  createdTo?: string;
  preset?: SearchPresetId;
  sortBy: "rating" | "newest" | "popular";
  page: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: Omit<AdvancedSearchFilters, "page">;
  createdAt: string;
  updatedAt: string;
}

export interface SearchPreset {
  id: SearchPresetId;
  label: string;
  description: string;
  filters: Partial<Omit<AdvancedSearchFilters, "page" | "query">>;
}
