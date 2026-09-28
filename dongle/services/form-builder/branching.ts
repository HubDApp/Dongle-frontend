/**
 * Form branching — conditional sections, multi-path validation, and back/change.
 */

import type {
  BranchCondition,
  BranchRule,
  FieldValidationError,
  FormAnswers,
  FormFieldDefinition,
  FormSchemaSnapshot,
  FormSectionDefinition,
  PathValidationResult,
} from "./types";
import { resolveLocalizedText } from "./i18n";
import type { LocaleCode } from "@/lib/i18n/locales";

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

export function evaluateCondition(
  condition: BranchCondition,
  answers: FormAnswers,
): boolean {
  const raw = answers[condition.fieldId];
  const expected = condition.value;

  switch (condition.operator) {
    case "exists":
      return raw !== undefined && raw !== null && raw !== "" && !(Array.isArray(raw) && raw.length === 0);
    case "equals":
      return raw === expected || String(raw) === String(expected);
    case "notEquals":
      return raw !== expected && String(raw) !== String(expected);
    case "includes": {
      const haystack = asArray(raw).map(String);
      if (Array.isArray(expected)) {
        return expected.every((item) => haystack.includes(String(item)));
      }
      return haystack.includes(String(expected));
    }
    case "notIncludes": {
      const haystack = asArray(raw).map(String);
      if (Array.isArray(expected)) {
        return expected.every((item) => !haystack.includes(String(item)));
      }
      return !haystack.includes(String(expected));
    }
    case "gt":
      return Number(raw) > Number(expected);
    case "gte":
      return Number(raw) >= Number(expected);
    case "lt":
      return Number(raw) < Number(expected);
    case "lte":
      return Number(raw) <= Number(expected);
    default:
      return false;
  }
}

export function ruleMatches(rule: BranchRule, answers: FormAnswers): boolean {
  if (rule.conditions.length === 0) return false;
  return rule.conditions.every((c) => evaluateCondition(c, answers));
}

/**
 * Resolve which sections are visible given current answers.
 * Non-branched sections are always visible; branched ones need a matching rule.
 */
export function getVisibleSections(
  schema: FormSchemaSnapshot,
  answers: FormAnswers,
): FormSectionDefinition[] {
  const revealed = new Set<string>();
  for (const rule of schema.branchRules) {
    if (ruleMatches(rule, answers)) {
      for (const id of rule.showSectionIds) revealed.add(id);
    }
  }

  return schema.sections.filter((section) => {
    if (!section.branched) return true;
    return revealed.has(section.id);
  });
}

export function getVisibleSectionIds(
  schema: FormSchemaSnapshot,
  answers: FormAnswers,
): string[] {
  return getVisibleSections(schema, answers).map((s) => s.id);
}

export function getVisibleFields(
  schema: FormSchemaSnapshot,
  answers: FormAnswers,
): FormFieldDefinition[] {
  const visibleIds = new Set(getVisibleSectionIds(schema, answers));
  const fieldById = new Map(schema.fields.map((f) => [f.id, f]));
  const fields: FormFieldDefinition[] = [];

  for (const section of schema.sections) {
    if (!visibleIds.has(section.id)) continue;
    for (const fieldId of section.fieldIds) {
      const field = fieldById.get(fieldId);
      if (field) fields.push(field);
    }
  }
  return fields;
}

/**
 * Active branch paths (rules that currently match). Supports multiple paths
 * when several rules fire at once.
 */
export function getActivePaths(
  schema: FormSchemaSnapshot,
  answers: FormAnswers,
): BranchRule[] {
  return schema.branchRules.filter((rule) => ruleMatches(rule, answers));
}

function validateField(
  field: FormFieldDefinition,
  answers: FormAnswers,
  locale: LocaleCode,
): FieldValidationError | null {
  const value = answers[field.id];
  const rules = field.validation;
  if (!rules) return null;

  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  if (rules.required && empty) {
    return {
      fieldId: field.id,
      rule: "required",
      message: resolveLocalizedText(
        rules.messages?.required ?? { en: "This field is required" },
        locale,
      ),
    };
  }

  if (empty) return null;

  if (typeof value === "string") {
    if (rules.minLength != null && value.length < rules.minLength) {
      return {
        fieldId: field.id,
        rule: "minLength",
        message: resolveLocalizedText(
          rules.messages?.minLength ?? {
            en: `Must be at least ${rules.minLength} characters`,
          },
          locale,
        ),
      };
    }
    if (rules.maxLength != null && value.length > rules.maxLength) {
      return {
        fieldId: field.id,
        rule: "maxLength",
        message: resolveLocalizedText(
          rules.messages?.maxLength ?? {
            en: `Must be at most ${rules.maxLength} characters`,
          },
          locale,
        ),
      };
    }
    if (rules.pattern) {
      const re = new RegExp(rules.pattern);
      if (!re.test(value)) {
        return {
          fieldId: field.id,
          rule: "pattern",
          message: resolveLocalizedText(
            rules.messages?.pattern ?? { en: "Invalid format" },
            locale,
          ),
        };
      }
    }
  }

  if (typeof value === "number" || (typeof value === "string" && value !== "" && !Number.isNaN(Number(value)))) {
    const num = Number(value);
    if (rules.min != null && num < rules.min) {
      return {
        fieldId: field.id,
        rule: "min",
        message: resolveLocalizedText(
          rules.messages?.min ?? { en: `Must be at least ${rules.min}` },
          locale,
        ),
      };
    }
    if (rules.max != null && num > rules.max) {
      return {
        fieldId: field.id,
        rule: "max",
        message: resolveLocalizedText(
          rules.messages?.max ?? { en: `Must be at most ${rules.max}` },
          locale,
        ),
      };
    }
  }

  return null;
}

/**
 * Validate only fields on the current path. Hidden branched sections are skipped
 * so users are not blocked by answers they never saw.
 */
export function validatePath(
  schema: FormSchemaSnapshot,
  answers: FormAnswers,
  locale: LocaleCode = "en",
): PathValidationResult {
  const visibleSections = getVisibleSections(schema, answers);
  const visibleSectionIds = visibleSections.map((s) => s.id);
  const fields = getVisibleFields(schema, answers);
  const errors: FieldValidationError[] = [];

  for (const field of fields) {
    const error = validateField(field, answers, locale);
    if (error) errors.push(error);
  }

  return {
    valid: errors.length === 0,
    errors,
    visibleSectionIds,
    validatedFieldIds: fields.map((f) => f.id),
  };
}

/**
 * When the user goes back and changes an answer, prune answers for sections
 * that are no longer visible so stale branch data cannot leak into submission.
 */
export function pruneAnswersForPath(
  schema: FormSchemaSnapshot,
  answers: FormAnswers,
): FormAnswers {
  const visibleFieldIds = new Set(getVisibleFields(schema, answers).map((f) => f.id));
  const next: FormAnswers = {};
  for (const [key, value] of Object.entries(answers)) {
    if (visibleFieldIds.has(key)) next[key] = value;
  }
  return next;
}

/**
 * Apply an answer change and return the pruned answer set for the new path.
 * Used when the user navigates back and edits a branching question.
 */
export function applyAnswerChange(
  schema: FormSchemaSnapshot,
  answers: FormAnswers,
  fieldId: string,
  value: FormAnswers[string],
): FormAnswers {
  return pruneAnswersForPath(schema, { ...answers, [fieldId]: value });
}
