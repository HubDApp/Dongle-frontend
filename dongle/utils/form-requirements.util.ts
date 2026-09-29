/**
 * Conditional required-field rules for the project registration form.
 *
 * Conditions are evaluated from current form values so validation, required
 * indicators, checklist badges, and error messages stay in sync.
 */

import { isBlank } from "@/lib/string";

export type ProjectFormRequirementField =
  | "name"
  | "primaryCategory"
  | "description"
  | "websiteUrl"
  | "githubUrl"
  | "logoUrl"
  | "docsUrl"
  | "auditReportUrl"
  | "bugBountyUrl"
  | "contractAddresses";

export interface FormRequirementValues {
  primaryCategory?: string;
  contractAddresses?: string[];
  githubUrl?: string;
  docsUrl?: string;
  auditReportUrl?: string;
  logoUrl?: string;
  bugBountyUrl?: string;
}

export interface FieldRequirement {
  field: ProjectFormRequirementField;
  required: boolean;
  /** Shown when the field fails validation under the active condition. */
  message?: string;
  /** Short reason shown next to the required indicator when conditional. */
  reason?: string;
}

const ALWAYS_REQUIRED: ProjectFormRequirementField[] = [
  "name",
  "primaryCategory",
  "description",
  "websiteUrl",
];

/**
 * Returns the effective required state for every project form field based on
 * the current values of other fields.
 *
 * Rules:
 * - Core fields are always required.
 * - DeFi / Payments → documentation URL is required.
 * - DeFi → audit report URL is required.
 * - Gaming / NFT → logo URL is required (visual products).
 * - Any contract address present → repository URL is required for transparency.
 * - Bug bounty stays optional unless an audit URL is provided (encourage pairing).
 */
export function getFieldRequirements(
  values: FormRequirementValues,
): Record<ProjectFormRequirementField, FieldRequirement> {
  const category = (values.primaryCategory ?? "").trim().toLowerCase();
  const hasContracts = (values.contractAddresses ?? []).some(
    (addr) => !isBlank(addr),
  );
  const hasAudit = !isBlank(values.auditReportUrl);

  const isDefi = category === "defi";
  const isPayments = category === "payments";
  const isGaming = category === "gaming";

  const base = (field: ProjectFormRequirementField): FieldRequirement => ({
    field,
    required: ALWAYS_REQUIRED.includes(field),
  });

  const requirements: Record<ProjectFormRequirementField, FieldRequirement> = {
    name: base("name"),
    primaryCategory: base("primaryCategory"),
    description: base("description"),
    websiteUrl: base("websiteUrl"),
    githubUrl: {
      field: "githubUrl",
      required: hasContracts,
      message: hasContracts
        ? "Repository URL is required when contract addresses are provided"
        : undefined,
      reason: hasContracts ? "Required when contracts are listed" : undefined,
    },
    logoUrl: {
      field: "logoUrl",
      required: isGaming,
      message: isGaming
        ? "Logo URL is required for Gaming / NFT projects"
        : undefined,
      reason: isGaming ? "Required for Gaming / NFT" : undefined,
    },
    docsUrl: {
      field: "docsUrl",
      required: isDefi || isPayments,
      message:
        isDefi || isPayments
          ? "Documentation URL is required for DeFi and Payments projects"
          : undefined,
      reason:
        isDefi || isPayments ? "Required for DeFi / Payments" : undefined,
    },
    auditReportUrl: {
      field: "auditReportUrl",
      required: isDefi,
      message: isDefi
        ? "Audit report URL is required for DeFi projects"
        : undefined,
      reason: isDefi ? "Required for DeFi" : undefined,
    },
    bugBountyUrl: {
      field: "bugBountyUrl",
      required: hasAudit && isDefi,
      message:
        hasAudit && isDefi
          ? "Bug bounty URL is recommended and required when an audit is linked for DeFi"
          : undefined,
      reason:
        hasAudit && isDefi ? "Required when audit is provided (DeFi)" : undefined,
    },
    contractAddresses: {
      field: "contractAddresses",
      required: false,
    },
  };

  return requirements;
}

export function isFieldRequired(
  field: ProjectFormRequirementField,
  values: FormRequirementValues,
): boolean {
  return getFieldRequirements(values)[field].required;
}

export function getRequirementMessage(
  field: ProjectFormRequirementField,
  values: FormRequirementValues,
): string | undefined {
  return getFieldRequirements(values)[field].message;
}

/** Human-readable field labels used in PDF export and checklist. */
export const FIELD_LABELS: Record<ProjectFormRequirementField, string> = {
  name: "Project Name",
  primaryCategory: "Category",
  description: "Description",
  websiteUrl: "Project Website",
  githubUrl: "Repository URL",
  logoUrl: "Logo URL",
  docsUrl: "Documentation URL",
  auditReportUrl: "Audit Report URL",
  bugBountyUrl: "Bug Bounty URL",
  contractAddresses: "Contract Addresses",
};
