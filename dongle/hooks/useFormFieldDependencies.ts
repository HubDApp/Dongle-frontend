/**
 * useFormFieldDependencies – Issue #493
 *
 * Wires the existing `lib/form-visibility.ts` condition engine into React form
 * state management, providing:
 *
 * - `isVisible(fieldPath)` — true when the field's dependency condition is met
 *   (or the field has no registered condition).
 * - `visibleValues` — a derived submission payload with hidden-field values
 *   omitted so stale hidden values never reach the API.
 * - No mutation of the live form state.  The sanitised payload is derived.
 *
 * Dependency schema example:
 * ```ts
 * const deps: FieldDependencyMap = {
 *   auditReportUrl: ConditionBuilder.when("primaryCategory").equals("defi"),
 *   bugBountyUrl: ConditionBuilder.and(
 *     ConditionBuilder.when("primaryCategory").equals("defi"),
 *     ConditionBuilder.when("auditReportUrl").isNotEmpty(),
 *   ),
 * };
 * ```
 *
 * Hidden field semantics:
 * - `isVisible` returns `false` → the field is hidden.
 * - The field's value is **omitted** from `visibleValues`.
 * - Validation of hidden fields must be disabled at the schema level (use
 *   the `optionalUrlSchema` / conditional `.superRefine` pattern already in
 *   ProjectForm rather than relying on this hook for validation gating).
 *
 * Circular dependencies:
 * If field A depends on field B and field B depends on field A, both will
 * always resolve to visible because the engine evaluates conditions
 * independently against the raw form values (no recursive resolution).
 * The schema author is responsible for avoiding logically circular schemas.
 */

"use client";

import { useMemo } from "react";
import {
  evaluateVisibility,
  type ConditionInput,
} from "@/lib/form-visibility";
import { getNestedValue, parsePath } from "@/lib/nested-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A map from dot-notation field paths to their visibility condition.
 *
 * Fields not present in this map are always considered visible.
 */
export type FieldDependencyMap = Record<string, ConditionInput>;

export interface UseFormFieldDependenciesOptions<
  T extends Record<string, unknown>,
> {
  /** The live form values (e.g. from `watch()` in React Hook Form). */
  formValues: T;
  /**
   * Map of field paths → visibility conditions.
   * Only fields listed here have conditional visibility.
   */
  dependencies: FieldDependencyMap;
}

export interface UseFormFieldDependenciesReturn<
  T extends Record<string, unknown>,
> {
  /**
   * Returns `true` when the field should be shown.
   * Fields not listed in `dependencies` are always visible.
   *
   * @param fieldPath Dot-notation path, e.g. "auditReportUrl" or "details.url"
   */
  isVisible: (fieldPath: string) => boolean;

  /**
   * A derived copy of `formValues` with hidden-field values removed.
   * Use this as the submission payload instead of the raw form values to
   * prevent stale hidden-field data from reaching the API.
   */
  visibleValues: Partial<T>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively removes a value at a dot-notation path from a plain-object tree.
 * Returns a new object; never mutates the input.
 */
function omitNestedPath(
  obj: Record<string, unknown>,
  path: string,
): Record<string, unknown> {
  const segments = parsePath(path);
  if (segments.length === 0) return obj;

  const [head, ...rest] = segments;
  const key = String(head);
  const clone = { ...obj };

  if (rest.length === 0) {
    delete clone[key];
    return clone;
  }

  const child = clone[key];
  if (child !== null && typeof child === "object" && !Array.isArray(child)) {
    clone[key] = omitNestedPath(child as Record<string, unknown>, rest.join("."));
  }

  return clone;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFormFieldDependencies<T extends Record<string, unknown>>(
  options: UseFormFieldDependenciesOptions<T>,
): UseFormFieldDependenciesReturn<T> {
  const { formValues, dependencies } = options;

  // Memoize visibility map: re-evaluate whenever form values change.
  const visibilityMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const fieldPath of Object.keys(dependencies)) {
      const condition = dependencies[fieldPath];
      map[fieldPath] = evaluateVisibility(
        condition as Parameters<typeof evaluateVisibility>[0],
        formValues as Record<string, unknown>,
      );
    }
    return map;
  }, [formValues, dependencies]);

  const isVisible = useMemo(
    () =>
      (fieldPath: string): boolean => {
        if (!Object.prototype.hasOwnProperty.call(visibilityMap, fieldPath)) {
          return true; // No condition registered → always visible
        }
        return visibilityMap[fieldPath];
      },
    [visibilityMap],
  );

  // Derive visibleValues by omitting hidden field paths from formValues.
  const visibleValues = useMemo(() => {
    let result: Record<string, unknown> = { ...formValues };
    for (const fieldPath of Object.keys(visibilityMap)) {
      if (!visibilityMap[fieldPath]) {
        result = omitNestedPath(result, fieldPath);
      }
    }
    return result as Partial<T>;
  }, [formValues, visibilityMap]);

  return { isVisible, visibleValues };
}

// ---------------------------------------------------------------------------
// Re-export condition builder for convenience
// ---------------------------------------------------------------------------
export { ConditionBuilder, VisibilityCondition } from "@/lib/form-visibility";
export type {
  VisibilityConditionDef,
  FieldConditionDef,
  CompositeConditionDef,
  ConditionOperator,
  ConditionInput,
} from "@/lib/form-visibility";
