/**
 * Form Field Visibility Conditions Engine (Issue #507)
 *
 * A reusable, chainable engine for conditionally displaying or hiding form fields
 * based on current form values, supporting complex nested conditions and AND/OR/NOT logic.
 *
 * Features:
 * - Field-based condition operators (equals, in, greaterThan, truthy, matches, etc.)
 * - Deep nested path resolution (e.g. `user.profile.verified`, `contracts[0].type`)
 * - Logical operators (AND, OR, NOT) with nested group evaluation
 * - Chainable, fluent builder API for clean and readable condition definitions
 * - React hook integration via `useFieldVisibility`
 */

import { getNestedValue } from "./nested-form";

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "in"
  | "notIn"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "between"
  | "isTruthy"
  | "isFalsy"
  | "isEmpty"
  | "isNotEmpty"
  | "matches"
  | "includes"
  | "custom";

export interface FieldConditionDef {
  type: "field";
  field: string;
  operator: ConditionOperator;
  value?: any;
  predicate?: (fieldValue: any, formValues: Record<string, any>) => boolean;
}

export interface CompositeConditionDef {
  type: "and" | "or" | "not";
  conditions: VisibilityConditionDef[];
}

export type VisibilityConditionDef = FieldConditionDef | CompositeConditionDef;

export type ConditionInput =
  | VisibilityConditionDef
  | ConditionBuilder
  | ((builder: ConditionBuilder) => ConditionBuilder);

function isEmptyValue(val: any): boolean {
  if (val == null) return true;
  if (typeof val === "string" && val.trim() === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === "object" && Object.keys(val).length === 0) return true;
  return false;
}

/**
 * Evaluates whether a condition matches against current form values.
 */
export function evaluateVisibility(
  condition: VisibilityConditionDef | ConditionBuilder,
  formValues: Record<string, any>
): boolean {
  if (!condition) return true;

  const def: VisibilityConditionDef =
    condition instanceof ConditionBuilder ? condition.build() : condition;

  if (def.type === "and") {
    if (!def.conditions || def.conditions.length === 0) return true;
    return def.conditions.every((c) => evaluateVisibility(c, formValues));
  }

  if (def.type === "or") {
    if (!def.conditions || def.conditions.length === 0) return true;
    return def.conditions.some((c) => evaluateVisibility(c, formValues));
  }

  if (def.type === "not") {
    if (!def.conditions || def.conditions.length === 0) return true;
    return !evaluateVisibility(def.conditions[0], formValues);
  }

  if (def.type === "field") {
    const rawValue = getNestedValue(formValues, def.field);

    switch (def.operator) {
      case "equals":
        return rawValue === def.value;

      case "notEquals":
        return rawValue !== def.value;

      case "in":
        return Array.isArray(def.value) ? def.value.includes(rawValue) : false;

      case "notIn":
        return Array.isArray(def.value) ? !def.value.includes(rawValue) : true;

      case "greaterThan":
        return typeof rawValue === "number" && rawValue > def.value;

      case "greaterThanOrEqual":
        return typeof rawValue === "number" && rawValue >= def.value;

      case "lessThan":
        return typeof rawValue === "number" && rawValue < def.value;

      case "lessThanOrEqual":
        return typeof rawValue === "number" && rawValue <= def.value;

      case "between":
        if (!Array.isArray(def.value) || def.value.length < 2) return false;
        return typeof rawValue === "number" && rawValue >= def.value[0] && rawValue <= def.value[1];

      case "isTruthy":
        return Boolean(rawValue);

      case "isFalsy":
        return !rawValue;

      case "isEmpty":
        return isEmptyValue(rawValue);

      case "isNotEmpty":
        return !isEmptyValue(rawValue);

      case "matches":
        if (typeof rawValue !== "string") return false;
        if (def.value instanceof RegExp) return def.value.test(rawValue);
        return new RegExp(def.value).test(rawValue);

      case "includes":
        if (Array.isArray(rawValue)) return rawValue.includes(def.value);
        if (typeof rawValue === "string") return rawValue.includes(String(def.value));
        return false;

      case "custom":
        return typeof def.predicate === "function"
          ? Boolean(def.predicate(rawValue, formValues))
          : true;

      default:
        return true;
    }
  }

  return true;
}

/**
 * Fluent builder class for creating chainable field visibility rules.
 *
 * Example:
 * ```ts
 * const condition = VisibilityCondition
 *   .when("projectType").equals("soroban")
 *   .andWhen("requiresAudit").isTruthy()
 *   .orWhen("contractAddress").isNotEmpty();
 * ```
 */
export class ConditionBuilder {
  private currentDef: VisibilityConditionDef;

  constructor(initial?: VisibilityConditionDef) {
    this.currentDef = initial || {
      type: "and",
      conditions: [],
    };
  }

  /**
   * Initializes a condition on a specific field.
   */
  static when(field: string): FieldConditionBuilder {
    return new FieldConditionBuilder(field);
  }

  /**
   * Logical AND composite condition.
   */
  static and(...conditions: ConditionInput[]): ConditionBuilder {
    const resolved = conditions.map(resolveConditionInput);
    return new ConditionBuilder({ type: "and", conditions: resolved });
  }

  /**
   * Logical OR composite condition.
   */
  static or(...conditions: ConditionInput[]): ConditionBuilder {
    const resolved = conditions.map(resolveConditionInput);
    return new ConditionBuilder({ type: "or", conditions: resolved });
  }

  /**
   * Logical NOT inversion condition.
   */
  static not(condition: ConditionInput): ConditionBuilder {
    return new ConditionBuilder({
      type: "not",
      conditions: [resolveConditionInput(condition)],
    });
  }

  /**
   * Chains an AND condition.
   */
  and(condition: ConditionInput): ConditionBuilder {
    const next = resolveConditionInput(condition);
    if (this.currentDef.type === "and") {
      return new ConditionBuilder({
        type: "and",
        conditions: [...this.currentDef.conditions, next],
      });
    }
    return new ConditionBuilder({
      type: "and",
      conditions: [this.currentDef, next],
    });
  }

  /**
   * Chains an AND condition starting on a field.
   */
  andWhen(field: string): FieldConditionBuilder {
    return new FieldConditionBuilder(field, this, "and");
  }

  /**
   * Chains an OR condition.
   */
  or(condition: ConditionInput): ConditionBuilder {
    const next = resolveConditionInput(condition);
    if (this.currentDef.type === "or") {
      return new ConditionBuilder({
        type: "or",
        conditions: [...this.currentDef.conditions, next],
      });
    }
    return new ConditionBuilder({
      type: "or",
      conditions: [this.currentDef, next],
    });
  }

  /**
   * Chains an OR condition starting on a field.
   */
  orWhen(field: string): FieldConditionBuilder {
    return new FieldConditionBuilder(field, this, "or");
  }

  /**
   * Inverts the current condition.
   */
  negate(): ConditionBuilder {
    return new ConditionBuilder({
      type: "not",
      conditions: [this.currentDef],
    });
  }

  /**
   * Returns the underlying AST representation.
   */
  build(): VisibilityConditionDef {
    return this.currentDef;
  }

  /**
   * Directly evaluates the condition against form values.
   */
  evaluate(formValues: Record<string, any>): boolean {
    return evaluateVisibility(this.currentDef, formValues);
  }
}

/**
 * Fluent builder for field-level assertions.
 */
export class FieldConditionBuilder {
  private parentBuilder?: ConditionBuilder;
  private combineMode?: "and" | "or";
  private fieldName: string;

  constructor(field: string, parent?: ConditionBuilder, combineMode?: "and" | "or") {
    this.fieldName = field;
    this.parentBuilder = parent;
    this.combineMode = combineMode;
  }

  private complete(operator: ConditionOperator, value?: any, predicate?: any): ConditionBuilder {
    const fieldDef: FieldConditionDef = {
      type: "field",
      field: this.fieldName,
      operator,
      value,
      predicate,
    };

    const nextBuilder = new ConditionBuilder(fieldDef);

    if (this.parentBuilder && this.combineMode) {
      return this.combineMode === "and"
        ? this.parentBuilder.and(nextBuilder)
        : this.parentBuilder.or(nextBuilder);
    }

    return nextBuilder;
  }

  equals(value: any): ConditionBuilder {
    return this.complete("equals", value);
  }

  notEquals(value: any): ConditionBuilder {
    return this.complete("notEquals", value);
  }

  in(values: any[]): ConditionBuilder {
    return this.complete("in", values);
  }

  notIn(values: any[]): ConditionBuilder {
    return this.complete("notIn", values);
  }

  greaterThan(value: number): ConditionBuilder {
    return this.complete("greaterThan", value);
  }

  greaterThanOrEqual(value: number): ConditionBuilder {
    return this.complete("greaterThanOrEqual", value);
  }

  lessThan(value: number): ConditionBuilder {
    return this.complete("lessThan", value);
  }

  lessThanOrEqual(value: number): ConditionBuilder {
    return this.complete("lessThanOrEqual", value);
  }

  between(min: number, max: number): ConditionBuilder {
    return this.complete("between", [min, max]);
  }

  isTruthy(): ConditionBuilder {
    return this.complete("isTruthy");
  }

  isFalsy(): ConditionBuilder {
    return this.complete("isFalsy");
  }

  isEmpty(): ConditionBuilder {
    return this.complete("isEmpty");
  }

  isNotEmpty(): ConditionBuilder {
    return this.complete("isNotEmpty");
  }

  matches(pattern: RegExp | string): ConditionBuilder {
    return this.complete("matches", pattern);
  }

  includes(value: any): ConditionBuilder {
    return this.complete("includes", value);
  }

  custom(predicate: (fieldValue: any, formValues: Record<string, any>) => boolean): ConditionBuilder {
    return this.complete("custom", undefined, predicate);
  }
}

function resolveConditionInput(input: ConditionInput): VisibilityConditionDef {
  if (input instanceof ConditionBuilder) {
    return input.build();
  }
  if (typeof input === "function") {
    const builder = new ConditionBuilder();
    return input(builder).build();
  }
  return input;
}

export const VisibilityCondition = ConditionBuilder;
