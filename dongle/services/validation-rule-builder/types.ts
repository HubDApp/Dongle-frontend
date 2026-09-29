/**
 * Visual validation rule builder types (Issue #544).
 * Rules are composed without writing code and can export/import Zod schemas.
 */

export type RuleOperator =
  | "required"
  | "minLength"
  | "maxLength"
  | "min"
  | "max"
  | "email"
  | "url"
  | "regex"
  | "equals"
  | "oneOf"
  | "integer"
  | "positive";

export type FieldValueType = "string" | "number" | "boolean" | "enum";

export interface ValidationRule {
  /** Stable id used by the drag-and-drop builder. */
  id: string;
  operator: RuleOperator;
  /** Operator argument (length, pattern, enum list, etc.). */
  value?: string | number | boolean | string[];
  /** User-facing error shown when the rule fails. */
  message?: string;
  /** Whether the rule is active in preview / export. */
  enabled: boolean;
}

export interface FieldRuleSet {
  fieldName: string;
  label?: string;
  valueType: FieldValueType;
  rules: ValidationRule[];
}

export interface RuleBuilderDocument {
  version: 1;
  name: string;
  description?: string;
  fields: FieldRuleSet[];
  updatedAt: string;
}

export interface ValidationPreviewIssue {
  fieldName: string;
  ruleId: string;
  operator: RuleOperator;
  message: string;
}

export interface ValidationPreviewResult {
  valid: boolean;
  issues: ValidationPreviewIssue[];
}

export interface ZodExportResult {
  /** Executable Zod object schema code (TypeScript). */
  code: string;
  /** Machine-readable JSON that can be re-imported. */
  json: RuleBuilderDocument;
}

export const RULE_OPERATOR_META: Record<
  RuleOperator,
  {
    label: string;
    appliesTo: FieldValueType[];
    needsValue: boolean;
    valueHint?: string;
  }
> = {
  required: {
    label: "Required",
    appliesTo: ["string", "number", "boolean", "enum"],
    needsValue: false,
  },
  minLength: {
    label: "Min length",
    appliesTo: ["string"],
    needsValue: true,
    valueHint: "Minimum characters",
  },
  maxLength: {
    label: "Max length",
    appliesTo: ["string"],
    needsValue: true,
    valueHint: "Maximum characters",
  },
  min: {
    label: "Minimum",
    appliesTo: ["number"],
    needsValue: true,
    valueHint: "Minimum number",
  },
  max: {
    label: "Maximum",
    appliesTo: ["number"],
    needsValue: true,
    valueHint: "Maximum number",
  },
  email: {
    label: "Email",
    appliesTo: ["string"],
    needsValue: false,
  },
  url: {
    label: "URL",
    appliesTo: ["string"],
    needsValue: false,
  },
  regex: {
    label: "Matches pattern",
    appliesTo: ["string"],
    needsValue: true,
    valueHint: "Regular expression",
  },
  equals: {
    label: "Equals",
    appliesTo: ["string", "number", "boolean"],
    needsValue: true,
    valueHint: "Exact value",
  },
  oneOf: {
    label: "One of",
    appliesTo: ["string", "enum"],
    needsValue: true,
    valueHint: "Comma-separated options",
  },
  integer: {
    label: "Integer",
    appliesTo: ["number"],
    needsValue: false,
  },
  positive: {
    label: "Positive",
    appliesTo: ["number"],
    needsValue: false,
  },
};
