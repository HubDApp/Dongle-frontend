/**
 * Form template types for saving, loading, and browsing project form presets.
 */

export type FormTemplateCategory =
  | "defi"
  | "gaming"
  | "infrastructure"
  | "payments"
  | "dao"
  | "general";

export interface FormTemplateData {
  name: string;
  primaryCategory: string;
  tags: string[];
  description: string;
  websiteUrl: string;
  githubUrl: string;
  logoUrl: string;
  docsUrl: string;
  auditReportUrl: string;
  bugBountyUrl: string;
  contractAddresses: string[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  category: FormTemplateCategory;
  data: FormTemplateData;
  /** Built-in library templates are not owned by a wallet. */
  isBuiltIn?: boolean;
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormTemplatePreview {
  id: string;
  name: string;
  description?: string;
  category: FormTemplateCategory;
  isBuiltIn: boolean;
  fieldCount: number;
  tags: string[];
}
