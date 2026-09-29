/**
 * Form builder types — versioning, branching, localization, and submissions.
 */

import type { LocaleCode } from "@/lib/i18n/locales";

/** Locale-keyed copy used for labels, placeholders, and messages. */
export type LocalizedText = Partial<Record<LocaleCode, string>> & { en: string };

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "boolean";

export type BranchOperator =
  | "equals"
  | "notEquals"
  | "includes"
  | "notIncludes"
  | "exists"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

/** A single condition on a prior answer that can reveal or hide a section. */
export interface BranchCondition {
  fieldId: string;
  operator: BranchOperator;
  value?: string | number | boolean | string[];
}

/**
 * When every condition matches (AND), the listed section becomes visible.
 * Sections without a rule are always visible on their path.
 */
export interface BranchRule {
  id: string;
  /** Section ids revealed when conditions match. */
  showSectionIds: string[];
  conditions: BranchCondition[];
  /** Optional human-readable path label for the builder. */
  pathLabel?: LocalizedText;
}

export interface FormFieldOption {
  value: string;
  label: LocalizedText;
}

export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  /** Localized validation / error messages keyed by rule name. */
  messages?: {
    required?: LocalizedText;
    minLength?: LocalizedText;
    maxLength?: LocalizedText;
    min?: LocalizedText;
    max?: LocalizedText;
    pattern?: LocalizedText;
    custom?: LocalizedText;
  };
}

export interface FormFieldDefinition {
  id: string;
  type: FormFieldType;
  label: LocalizedText;
  placeholder?: LocalizedText;
  helpText?: LocalizedText;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  /** When set, field only renders if its parent section is visible. */
  defaultValue?: string | number | boolean | string[];
}

export interface FormSectionDefinition {
  id: string;
  title: LocalizedText;
  description?: LocalizedText;
  fieldIds: string[];
  /** If true, section is only shown when a branch rule reveals it. */
  branched?: boolean;
}

/** Immutable snapshot of a form schema at a point in time. */
export interface FormSchemaSnapshot {
  formId: string;
  name: LocalizedText;
  description?: LocalizedText;
  sections: FormSectionDefinition[];
  fields: FormFieldDefinition[];
  branchRules: BranchRule[];
  /** Locale codes the form declares translations for. */
  supportedLocales: LocaleCode[];
}

export interface FormChangelogEntry {
  version: number;
  summary: string;
  author?: string;
  createdAt: number;
  /** Field/section ids touched in this version. */
  changedPaths?: string[];
}

export interface FormVersionRecord {
  version: number;
  schema: FormSchemaSnapshot;
  changelog: FormChangelogEntry;
  createdAt: number;
  /** True when this version is the active publish target. */
  isActive: boolean;
}

export interface FormVersionStore {
  formId: string;
  versions: FormVersionRecord[];
  activeVersion: number;
  updatedAt: number;
}

export type FormAnswers = Record<string, string | number | boolean | string[] | undefined>;

export interface FieldValidationError {
  fieldId: string;
  rule: string;
  message: string;
}

export interface PathValidationResult {
  valid: boolean;
  errors: FieldValidationError[];
  /** Section ids that were part of the evaluated path. */
  visibleSectionIds: string[];
  /** Field ids validated on that path. */
  validatedFieldIds: string[];
}

export interface FormSubmissionRecord {
  confirmationNumber: string;
  formId: string;
  formVersion: number;
  answers: FormAnswers;
  visibleSectionIds: string[];
  locale: LocaleCode;
  submittedAt: number;
  summaryLabels: Record<string, string>;
}

export interface FormNextStep {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  href?: string;
}
