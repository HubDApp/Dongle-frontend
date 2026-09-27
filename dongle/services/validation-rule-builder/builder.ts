/**
 * Helpers for creating and reordering validation rules (Issue #544).
 */

import type {
  FieldRuleSet,
  FieldValueType,
  RuleBuilderDocument,
  RuleOperator,
  ValidationRule,
} from "./types";
import { RULE_OPERATOR_META } from "./types";

let ruleCounter = 0;

export function createRuleId(): string {
  ruleCounter += 1;
  return `rule_${Date.now().toString(36)}_${ruleCounter}`;
}

export function createRule(
  operator: RuleOperator,
  overrides: Partial<Omit<ValidationRule, "id" | "operator">> = {},
): ValidationRule {
  return {
    id: createRuleId(),
    operator,
    enabled: true,
    value: RULE_OPERATOR_META[operator].needsValue ? "" : undefined,
    message: undefined,
    ...overrides,
  };
}

export function createFieldRuleSet(
  fieldName: string,
  valueType: FieldValueType = "string",
  label?: string,
): FieldRuleSet {
  return {
    fieldName,
    label: label ?? fieldName,
    valueType,
    rules: [createRule("required")],
  };
}

export function createEmptyDocument(name = "Untitled form"): RuleBuilderDocument {
  return {
    version: 1,
    name,
    fields: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Reorder rules within a field using drag-and-drop indices. */
export function reorderRules(
  rules: ValidationRule[],
  fromIndex: number,
  toIndex: number,
): ValidationRule[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= rules.length ||
    toIndex >= rules.length ||
    fromIndex === toIndex
  ) {
    return rules;
  }

  const next = [...rules];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Operators that make sense for a given field value type. */
export function operatorsForType(valueType: FieldValueType): RuleOperator[] {
  return (Object.keys(RULE_OPERATOR_META) as RuleOperator[]).filter((op) =>
    RULE_OPERATOR_META[op].appliesTo.includes(valueType),
  );
}

export function touchDocument(doc: RuleBuilderDocument): RuleBuilderDocument {
  return { ...doc, updatedAt: new Date().toISOString() };
}
