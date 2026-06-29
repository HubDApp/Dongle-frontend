/**
 * Canonical project types and categories for the entire application
 * This is the single source of truth for project data structure and categories
 */

export const PROJECT_CATEGORIES = {
  DEFI: "DeFi / DEX",
  GAMING: "Gaming / NFT",
  INFRASTRUCTURE: "Infrastructure",
  PAYMENTS: "Payments",
  DAO: "DAO",
} as const;

export type ProjectCategory = typeof PROJECT_CATEGORIES[keyof typeof PROJECT_CATEGORIES];

export const ALL_CATEGORIES: (ProjectCategory | "All")[] = [
  "All",
  PROJECT_CATEGORIES.DEFI,
  PROJECT_CATEGORIES.GAMING,
  PROJECT_CATEGORIES.INFRASTRUCTURE,
  PROJECT_CATEGORIES.PAYMENTS,
  PROJECT_CATEGORIES.DAO,
];

/**
 * Map form values to display labels
 * Used in ProjectForm to map internal values to display categories
 */
export const CATEGORY_FORM_MAP: Record<string, ProjectCategory> = {
  defi: PROJECT_CATEGORIES.DEFI,
  "defi-dex": PROJECT_CATEGORIES.DEFI,
  gaming: PROJECT_CATEGORIES.GAMING,
  nfts: PROJECT_CATEGORIES.GAMING,
  "gaming-nft": PROJECT_CATEGORIES.GAMING,
  infrastructure: PROJECT_CATEGORIES.INFRASTRUCTURE,
  tools: PROJECT_CATEGORIES.INFRASTRUCTURE,
  payments: PROJECT_CATEGORIES.PAYMENTS,
  dao: PROJECT_CATEGORIES.DAO,
  governance: PROJECT_CATEGORIES.DAO,
  social: PROJECT_CATEGORIES.DAO, // Map social to DAO for now
};

/**
 * Reverse map: display labels to form values
 */
export const CATEGORY_DISPLAY_TO_FORM: Record<ProjectCategory, string> = {
  [PROJECT_CATEGORIES.DEFI]: "defi",
  [PROJECT_CATEGORIES.GAMING]: "gaming",
  [PROJECT_CATEGORIES.INFRASTRUCTURE]: "infrastructure",
  [PROJECT_CATEGORIES.PAYMENTS]: "payments",
  [PROJECT_CATEGORIES.DAO]: "dao",
};

/**
 * Form options for ProjectForm component
 */
export const CATEGORY_FORM_OPTIONS = [
  { value: "defi", label: PROJECT_CATEGORIES.DEFI },
  { value: "gaming", label: PROJECT_CATEGORIES.GAMING },
  { value: "infrastructure", label: PROJECT_CATEGORIES.INFRASTRUCTURE },
  { value: "payments", label: PROJECT_CATEGORIES.PAYMENTS },
  { value: "dao", label: PROJECT_CATEGORIES.DAO },
];

/**
 * Canonical Project interface
 */
export interface Project {
  id: string;
  name: string;
  primaryCategory: ProjectCategory;
  category?: ProjectCategory; // For backward compatibility/migration
  tags?: string[];
  description: string;
  rating: number;
  reviews: number;
  createdAt: string; // ISO date string
  websiteUrl?: string;
  githubUrl?: string;
  logoUrl?: string;
  docsUrl?: string;
  auditReportUrl?: string;
  bugBountyUrl?: string;
  domain?: string;
  ownerAddress?: string;
}

/**
 * Normalize a category string to canonical form
 * Handles various input formats and returns the canonical category
 */
export function normalizeCategory(input: string): ProjectCategory | null {
  const normalized = input.toLowerCase().trim();
  return CATEGORY_FORM_MAP[normalized] || null;
}

/**
 * Validate if a category is valid
 */
export function isValidCategory(category: string): category is ProjectCategory {
  return Object.values(PROJECT_CATEGORIES).includes(category as ProjectCategory);
}

/**
 * Get all valid categories (excluding "All")
 */
export function getValidCategories(): ProjectCategory[] {
  return Object.values(PROJECT_CATEGORIES);
}
