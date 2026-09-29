/**
 * useFormChangeDetection – Issue #492
 *
 * Reusable hook for detecting unsaved changes in forms by performing a
 * deterministic deep comparison between the current form values and an
 * initial (baseline) snapshot.
 *
 * Features:
 * - Deep equality comparison: handles strings, numbers, booleans,
 *   null/undefined, nested objects, arrays, and nested arrays/objects.
 * - Ignored fields: any number of dot-notation field paths may be
 *   excluded from the dirty check.
 * - Reset baseline: call `resetBaseline(newValues?)` after a successful
 *   save, draft restoration, or explicit form reset to establish a new
 *   clean state.
 * - Does NOT rely on object reference equality (independently created
 *   objects with equivalent contents are treated as equal).
 *
 * @example
 * const { isDirty, resetBaseline } = useFormChangeDetection({
 *   initialValues: defaultFormValues,
 *   currentValues: watchedValues,
 *   ignoreFields: ["updatedAt"],
 * });
 */

"use client";

import { useMemo, useRef, useCallback } from "react";
import { getNestedValue } from "@/lib/nested-form";

// ---------------------------------------------------------------------------
// Deep equality
// ---------------------------------------------------------------------------

/**
 * Deterministic deep equality check that handles the superset of value types
 * that appear in form state: primitives, Date, null, undefined, arrays, and
 * plain objects.  Does not handle circular references (form values never are).
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  // Both null/undefined was already caught above (a===b when both null)
  if (a == null || b == null) return false;

  // Date
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Coerce primitives for string/number mismatches to avoid false positives:
  // we keep the strict check here – a form field switching "1" → 1 IS a change.
  if (typeof a !== "object" || typeof b !== "object") return false;

  // Arrays
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  // Plain objects
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
}

// ---------------------------------------------------------------------------
// Ignore-field masking
// ---------------------------------------------------------------------------

/**
 * Produces a shallow copy of `values` with the listed dot-notation paths
 * set to `undefined` so they are excluded from the equality check.
 *
 * Only top-level and single-level nested paths are supported; deeper nesting
 * can be addressed by providing additional paths.
 */
function maskIgnoredFields<T extends Record<string, unknown>>(
  values: T,
  ignoreFields: readonly string[],
): Record<string, unknown> {
  if (ignoreFields.length === 0) return values;

  // Work with a shallow clone of the root so we never mutate the originals
  const masked: Record<string, unknown> = { ...values };

  for (const path of ignoreFields) {
    const dotIdx = path.indexOf(".");
    if (dotIdx === -1) {
      // Top-level field
      masked[path] = undefined;
    } else {
      // Nested field: clone the intermediate object and blank the leaf
      const root = path.slice(0, dotIdx);
      const rest = path.slice(dotIdx + 1);
      if (Object.prototype.hasOwnProperty.call(masked, root)) {
        const nested = getNestedValue<unknown>(masked, root);
        if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
          const clonedNested = { ...(nested as Record<string, unknown>) };
          // Recursively mask the rest of the path inside the nested object
          const restDotIdx = rest.indexOf(".");
          if (restDotIdx === -1) {
            clonedNested[rest] = undefined;
          } else {
            // For simplicity with the form's known depth, blank the entire
            // sub-path via getNestedValue / a recursive call
            maskIgnoredFields(clonedNested as Record<string, unknown>, [rest]);
          }
          masked[root] = clonedNested;
        }
      }
    }
  }

  return masked;
}

// ---------------------------------------------------------------------------
// Hook types
// ---------------------------------------------------------------------------

export interface UseFormChangeDetectionOptions<
  T extends Record<string, unknown>,
> {
  /** The baseline form values (before the user made changes). */
  initialValues: T;
  /** The live form values to compare against the baseline. */
  currentValues: T;
  /**
   * Dot-notation field paths to exclude from the dirty check.
   * @example ["updatedAt", "meta.internalFlag"]
   */
  ignoreFields?: readonly string[];
}

export interface UseFormChangeDetectionReturn<
  T extends Record<string, unknown>,
> {
  /**
   * `true` when `currentValues` differs meaningfully from the baseline.
   * Always `false` for ignored fields.
   */
  isDirty: boolean;
  /**
   * Establishes a new clean baseline.
   *
   * Call this after:
   * - A successful save or submission.
   * - A draft restoration.
   * - An explicit form reset.
   *
   * When called with no argument the current `currentValues` becomes the
   * new baseline.  Pass an explicit value to override.
   */
  resetBaseline: (newBaseline?: T) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFormChangeDetection<T extends Record<string, unknown>>(
  options: UseFormChangeDetectionOptions<T>,
): UseFormChangeDetectionReturn<T> {
  const { initialValues, currentValues, ignoreFields = [] } = options;

  // The mutable baseline ref is updated by resetBaseline().
  // We initialise it from initialValues once so stale closures are avoided.
  const baselineRef = useRef<T>(initialValues);

  const isDirty = useMemo(() => {
    const maskedBaseline = maskIgnoredFields(
      baselineRef.current as Record<string, unknown>,
      ignoreFields,
    );
    const maskedCurrent = maskIgnoredFields(
      currentValues as Record<string, unknown>,
      ignoreFields,
    );
    return !deepEqual(maskedBaseline, maskedCurrent);
  }, [currentValues, ignoreFields]);

  const resetBaseline = useCallback(
    (newBaseline?: T) => {
      baselineRef.current = newBaseline ?? currentValues;
    },
    [currentValues],
  );

  return { isDirty, resetBaseline };
}
