/**
 * Dynamic array-field helpers for the form builder (Issue #505).
 *
 * An array field holds a repeating group of primitive items. This module owns
 * the list mutations (add / remove / reorder) and per-item validation so the
 * builder UI, the validator, and react-hook-form adapters all agree on the
 * semantics instead of each hand-rolling splice logic.
 *
 * Pure functions: no React, no DOM. Every operation returns a new array and
 * leaves the input untouched, which is what makes them safe to use inside
 * react-hook-form's immutable update model.
 */

import type {
  FieldValidationError,
  FormAnswers,
  FormFieldDefinition,
  FormAnswers as Answers,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default ceiling on array length.
 *
 * Bounded so a malformed or hostile payload cannot grow without limit — the
 * same reasoning as the whitelist caps on the escrow contract. Authors can
 * raise or lower it per field via `validation.maxItems`.
 */
export const DEFAULT_MAX_ARRAY_ITEMS = 50;

// ---------------------------------------------------------------------------
// Mutation helpers
// ---------------------------------------------------------------------------

/**
 * Appends an item.
 *
 * A non-string primitive is coerced so callers can pass a number from an input
 * without a manual `String()`. Returns the input unchanged once the field is
 * already at its cap, so the ceiling is enforced by the helper rather than
 * relying on every call site to check.
 */
export function addArrayItem<T>(
  items: readonly T[] | undefined,
  item: T | string | number,
  maxItems: number = DEFAULT_MAX_ARRAY_ITEMS,
): T[] {
  const next = items ? [...items] : [];
  if (next.length >= maxItems) return next;
  next.push(item as T);
  return next;
}

/**
 * Removes the item at `index`.
 *
 * Out-of-range indices return a copy rather than throwing: a reorder or remove
 * racing an async validator can legitimately produce a stale index, and a
 * stale index should be a no-op, not a crash.
 */
export function removeArrayItem<T>(
  items: readonly T[] | undefined,
  index: number,
): T[] {
  if (!items) return [];
  if (index < 0 || index >= items.length) return [...items];
  const next = [...items];
  next.splice(index, 1);
  return next;
}

/**
 * Moves the item at `from` to `to`, shifting the items in between.
 *
 * Out-of-range indices return a copy unchanged. Moving onto the same slot is a
 * no-op copy, which is what an up-arrow on the first row (or a down-arrow on
 * the last) should produce.
 */
export function reorderArrayItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const next = [...items];
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= next.length ||
    to >= next.length
  ) {
    return next;
  }
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Convenience wrapper for a "move up" control. */
export function moveArrayItemUp<T>(items: readonly T[], index: number): T[] {
  return index <= 0 ? [...items] : reorderArrayItem(items, index, index - 1);
}

/** Convenience wrapper for a "move down" control. */
export function moveArrayItemDown<T>(
  items: readonly T[],
  index: number,
): T[] {
  return index < 0 || index >= items.length - 1
    ? [...items]
    : reorderArrayItem(items, index, index + 1);
}

/**
 * Replaces the whole answer for one array field, returning a new answers object.
 *
 * Shaped for react-hook-form's `setValue` / `Controller` flow, where the field
 * is addressed by id inside a `FormAnswers` map rather than as a bare array.
 */
export function setArrayFieldValue(
  answers: FormAnswers,
  fieldId: string,
  items: readonly string[],
): Answers {
  return { ...answers, [fieldId]: [...items] };
}

// ---------------------------------------------------------------------------
// Per-item validation
// ---------------------------------------------------------------------------

/** One failing item within an array field. */
export interface ArrayItemError {
  /** Position of the offending item within the array. */
  index: number;
  /** Rule that failed, matching the `rule` values used by scalar fields. */
  rule: string;
  /** Human-readable message. */
  message: string;
}

/** Result of validating one array field. */
export interface ArrayFieldValidationResult {
  valid: boolean;
  errors: ArrayItemError[];
}

const isBlank = (value: string): boolean => value.trim().length === 0;

/**
 * Validates every item in an array field independently.
 *
 * Each item is checked against the same rule set, so one bad entry does not
 * mask the rest — the errors array carries every offending index rather than
 * stopping at the first, which is what lets the UI mark all bad rows at once.
 *
 * Supported rules (all optional):
 * - `required`    — no item may be blank; a blank item fails at its own index
 * - `minLength` / `maxLength` — measured on the trimmed value
 * - `pattern`     — RegExp source string, tested against the trimmed value
 * - `minItems` / `maxItems` — bounds on the array length itself, reported
 *   against index -1 so the caller can distinguish a length problem from an
 *   item problem
 */
export function validateArrayField(
  field: FormFieldDefinition,
  answers: FormAnswers,
): ArrayFieldValidationResult {
  const rules = field.validation;
  if (!rules) return { valid: true, errors: [] };

  const raw = answers[field.id];
  const items: string[] = Array.isArray(raw)
    ? (raw as string[])
    : typeof raw === "string"
      ? [raw]
      : [];

  const errors: ArrayItemError[] = [];

  // Length rules report at index -1: not attributable to a single row.
  if (rules.required && items.length === 0) {
    errors.push({
      index: -1,
      rule: "required",
      message: "Add at least one item",
    });
  }
  if (rules.minItems != null && items.length < rules.minItems) {
    errors.push({
      index: -1,
      rule: "minItems",
      message: `Add at least ${rules.minItems} item${rules.minItems === 1 ? "" : "s"}`,
    });
  }
  if (rules.maxItems != null && items.length > rules.maxItems) {
    errors.push({
      index: -1,
      rule: "maxItems",
      message: `Remove items — no more than ${rules.maxItems} allowed`,
    });
  }

  // Per-item rules.
  items.forEach((item, index) => {
    const value = typeof item === "string" ? item.trim() : "";

    if (isBlank(value)) {
      if (rules.required) {
        errors.push({
          index,
          rule: "required",
          message: `Item ${index + 1} is required`,
        });
      }
      // A blank item short-circuits: running minLength/pattern against ""
      // would stack a second, confusing error on the same row.
      return;
    }

    if (rules.minLength != null && value.length < rules.minLength) {
      errors.push({
        index,
        rule: "minLength",
        message: `Item ${index + 1} must be at least ${rules.minLength} characters`,
      });
    }
    if (rules.maxLength != null && value.length > rules.maxLength) {
      errors.push({
        index,
        rule: "maxLength",
        message: `Item ${index + 1} must be at most ${rules.maxLength} characters`,
      });
    }
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      errors.push({
        index,
        rule: "pattern",
        message: rules.messages?.custom?.en ?? `Item ${index + 1} is not valid`,
      });
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Flattens array-field errors into the same `FieldValidationError[]` shape the
 * scalar path produces, so `validatePath` and any consumer already handling
 * scalar errors work unchanged.
 *
 * The item index is appended to the field id (`tags[2]`) so the UI can map an
 * error back to a specific row.
 */
export function toFieldValidationErrors(
  fieldId: string,
  result: ArrayFieldValidationResult,
): FieldValidationError[] {
  return result.errors.map((error) => ({
    fieldId:
      error.index >= 0 ? `${fieldId}[${error.index}]` : fieldId,
    rule: error.rule,
    message: error.message,
  }));
}