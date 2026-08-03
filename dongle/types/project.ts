/**
 * Canonical project types and categories for the entire application
 * This is the single source of truth for project data structure and categories
 */

import { RepositoryMetadata } from "./repository";

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
 * Lifecycle state for a project.
 *
 * Projects are no longer treated as always active. A project can be archived,
 * deprecated, paused, flagged, or removed by an owner or admin.
 */
export type ProjectStatus =
  | "active"
  | "paused"
  | "deprecated"
  | "archived"
  | "flagged"
  | "removed";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "active",
  "paused",
  "deprecated",
  "archived",
  "flagged",
  "removed",
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  deprecated: "Deprecated",
  archived: "Archived",
  flagged: "Flagged",
  removed: "Removed",
};

/**
 * The lifecycle status of a project, or "active" when the field is absent.
 * Older records without a `status` field are treated as active.
 */
export function getProjectStatus(status?: ProjectStatus): ProjectStatus {
  return status && status in PROJECT_STATUS_LABELS ? status : "active";
}

export function getProjectStatusLabel(status?: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[getProjectStatus(status)];
}

/** True only for projects that are currently active. */
export function isProjectActive(status?: ProjectStatus): boolean {
  return getProjectStatus(status) === "active";
}

/**
 * Canonical Project interface.
 * Use `primaryCategory` everywhere — it holds the display-label form of the
 * category (e.g. "DeFi / DEX"). Never store raw form values ("defi") here.
 */
export interface Project {
  id: string;
  name: string;
  primaryCategory: ProjectCategory;
  /** Lifecycle state; defaults to "active" when omitted. */
  status?: ProjectStatus;
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
  repositoryMetadata?: RepositoryMetadata; // Cached repository metadata
  /**
   * Optional list of Soroban contract IDs associated with this project.
   * Each entry must be a valid Soroban contract address: starts with 'C',
   * followed by 55 base-32 characters (A-Z, 2-7), total length 56.
   */
  contractAddresses?: string[];
}

export type ClaimProofType = "website" | "repository" | "admin_review";

export type ProjectClaimRequestStatus = "pending" | "approved" | "rejected";

export const PROJECT_CLAIM_CONSTRAINTS = {
  EXPLANATION_MAX_LENGTH: 2000,
} as const;

export interface ProjectClaimRequest {
  id: string;
  projectId: string;
  requestedBy: string;
  proofType: ClaimProofType;
  proofValue: string;
  explanation: string;
  status: ProjectClaimRequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface ProjectClaimRequestValidationError {
  field: "projectId" | "proofType" | "proofValue" | "explanation";
  message: string;
}

export const PROJECT_CLAIM_PROOF_OPTIONS: { value: ClaimProofType; label: string }[] = [
  { value: "website", label: "Website or Domain Proof" },
  { value: "repository", label: "Repository Proof" },
  { value: "admin_review", label: "Admin Review" },
];

export type ProjectReportReason =
  | "phishing"
  | "impersonation"
  | "broken_links"
  | "fraud"
  | "inappropriate";

export type ProjectReportStatus = "pending" | "resolved" | "dismissed";

export type ProjectModerationActionType = "resolved" | "dismissed";

export const PROJECT_REPORT_REASONS: { value: ProjectReportReason; label: string }[] = [
  { value: "phishing", label: "Phishing or Scam" },
  { value: "impersonation", label: "Impersonation" },
  { value: "broken_links", label: "Broken Links" },
  { value: "fraud", label: "Fraud" },
  { value: "inappropriate", label: "Inappropriate Content" },
];

export const PROJECT_REPORT_CONSTRAINTS = {
  EXPLANATION_MAX_LENGTH: 2000,
} as const;

export interface ProjectReport {
  id: string;
  projectId: string;
  reporterAddress: string;
  reason: ProjectReportReason;
  explanation: string;
  status: ProjectReportStatus;
  createdAt: string;
}

export interface ProjectModerationAction {
  id: string;
  reportId: string;
  moderatorAddress: string;
  action: ProjectModerationActionType;
  reason: string;
  timestamp: string;
}

export interface ProjectReportValidationError {
  field: "reason" | "explanation";
  message: string;
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
