/**
 * Preview validation against sample values without requiring Zod at runtime
 * for every keystroke (Issue #544).
 */

import type {
  FieldRuleSet,
  ValidationPreviewIssue,
  ValidationPreviewResult,
  ValidationRule,
} from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === "";
}

function defaultMessage(rule: ValidationRule, fieldLabel: string): string {
  if (rule.message?.trim()) return rule.message.trim();

  switch (rule.operator) {
    case "required":
      return `${fieldLabel} is required`;
    case "minLength":
      return `${fieldLabel} must be at least ${rule.value} characters`;
    case "maxLength":
      return `${fieldLabel} must be at most ${rule.value} characters`;
    case "min":
      return `${fieldLabel} must be at least ${rule.value}`;
    case "max":
      return `${fieldLabel} must be at most ${rule.value}`;
    case "email":
      return `${fieldLabel} must be a valid email`;
    case "url":
      return `${fieldLabel} must be a valid URL`;
    case "regex":
      return `${fieldLabel} has an invalid format`;
    case "equals":
      return `${fieldLabel} must equal ${String(rule.value)}`;
    case "oneOf":
      return `${fieldLabel} must be one of the allowed values`;
    case "integer":
      return `${fieldLabel} must be an integer`;
    case "positive":
      return `${fieldLabel} must be positive`;
    default:
      return `${fieldLabel} is invalid`;
  }
}

function parseOneOf(value: ValidationRule["value"]): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function evaluateRule(
  rule: ValidationRule,
  raw: unknown,
  field: FieldRuleSet,
): string | null {
  if (!rule.enabled) return null;

  const label = field.label || field.fieldName;
  const asString = raw == null ? "" : String(raw);

  switch (rule.operator) {
    case "required":
      return isBlank(raw) ? defaultMessage(rule, label) : null;
    case "minLength": {
      if (isBlank(raw)) return null;
      const min = Number(rule.value ?? 0);
      return asString.length < min ? defaultMessage(rule, label) : null;
    }
    case "maxLength": {
      if (isBlank(raw)) return null;
      const max = Number(rule.value ?? Number.MAX_SAFE_INTEGER);
      return asString.length > max ? defaultMessage(rule, label) : null;
    }
    case "min": {
      if (isBlank(raw)) return null;
      const n = Number(raw);
      if (Number.isNaN(n)) return `${label} must be a number`;
      return n < Number(rule.value ?? 0) ? defaultMessage(rule, label) : null;
    }
    case "max": {
      if (isBlank(raw)) return null;
      const n = Number(raw);
      if (Number.isNaN(n)) return `${label} must be a number`;
      return n > Number(rule.value ?? 0) ? defaultMessage(rule, label) : null;
    }
    case "email":
      if (isBlank(raw)) return null;
      return EMAIL_RE.test(asString) ? null : defaultMessage(rule, label);
    case "url": {
      if (isBlank(raw)) return null;
      try {
        // eslint-disable-next-line no-new
        new URL(asString);
        return null;
      } catch {
        return defaultMessage(rule, label);
      }
    }
    case "regex": {
      if (isBlank(raw)) return null;
      try {
        const re = new RegExp(String(rule.value ?? ""));
        return re.test(asString) ? null : defaultMessage(rule, label);
      } catch {
        return `Invalid pattern on ${label}`;
      }
    }
    case "equals":
      if (isBlank(raw) && isBlank(rule.value)) return null;
      return String(raw) === String(rule.value) ? null : defaultMessage(rule, label);
    case "oneOf": {
      if (isBlank(raw)) return null;
      const allowed = parseOneOf(rule.value);
      return allowed.includes(asString) ? null : defaultMessage(rule, label);
    }
    case "integer": {
      if (isBlank(raw)) return null;
      const n = Number(raw);
      return Number.isInteger(n) ? null : defaultMessage(rule, label);
    }
    case "positive": {
      if (isBlank(raw)) return null;
      const n = Number(raw);
      return !Number.isNaN(n) && n > 0 ? null : defaultMessage(rule, label);
    }
    default:
      return null;
  }
}

/** Run all enabled rules against a sample payload for live preview. */
export function previewValidation(
  fields: FieldRuleSet[],
  values: Record<string, unknown>,
): ValidationPreviewResult {
  const issues: ValidationPreviewIssue[] = [];

  for (const field of fields) {
    const raw = values[field.fieldName];
    for (const rule of field.rules) {
      const message = evaluateRule(rule, raw, field);
      if (message) {
        issues.push({
          fieldName: field.fieldName,
          ruleId: rule.id,
          operator: rule.operator,
          message,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
