/**
 * Tests for the dynamic array field type (Issue #505).
 *
 * Covers add / remove / reorder mutations and per-item validation, per the
 * issue's acceptance criteria.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_MAX_ARRAY_ITEMS,
  addArrayItem,
  moveArrayItemDown,
  moveArrayItemUp,
  removeArrayItem,
  reorderArrayItem,
  setArrayFieldValue,
  toFieldValidationErrors,
  validateArrayField,
} from "@/services/form-builder/array-field";
import type { FormAnswers, FormFieldDefinition } from "@/services/form-builder/types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const tagsField = (
  validation?: FormFieldDefinition["validation"],
): FormFieldDefinition => ({
  id: "tags",
  type: "array",
  label: { en: "Tags" },
  validation,
});

// ─── add ──────────────────────────────────────────────────────────────────────

describe("addArrayItem", () => {
  it("appends to an existing list", () => {
    expect(addArrayItem(["a"], "b")).toEqual(["a", "b"]);
  });

  it("creates a list when the field is undefined", () => {
    expect(addArrayItem(undefined, "a")).toEqual(["a"]);
  });

  it("does not mutate the input", () => {
    const original = ["a"];
    addArrayItem(original, "b");
    expect(original).toEqual(["a"]);
  });

  it("enforces the default cap", () => {
    const full = Array.from({ length: DEFAULT_MAX_ARRAY_ITEMS }, (_, i) => `i${i}`);
    const result = addArrayItem(full, "overflow");
    expect(result).toHaveLength(DEFAULT_MAX_ARRAY_ITEMS);
    expect(result).not.toContain("overflow");
  });

  it("respects a custom cap", () => {
    expect(addArrayItem(["a"], "b", 1)).toEqual(["a"]);
  });
});

// ─── remove ──────────────────────────────────────────────────────────────────

describe("removeArrayItem", () => {
  it("removes the item at the given index", () => {
    expect(removeArrayItem(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });

  it("removes the first and last items", () => {
    expect(removeArrayItem(["a", "b", "c"], 0)).toEqual(["b", "c"]);
    expect(removeArrayItem(["a", "b", "c"], 2)).toEqual(["a", "b"]);
  });

  it("returns an empty array for an undefined field", () => {
    expect(removeArrayItem(undefined, 0)).toEqual([]);
  });

  it("is a no-op copy for an out-of-range index", () => {
    // Guards the "stale index from a racing async validator" case.
    expect(removeArrayItem(["a"], 5)).toEqual(["a"]);
    expect(removeArrayItem(["a"], -1)).toEqual(["a"]);
  });

  it("can empty the list", () => {
    expect(removeArrayItem(["a"], 0)).toEqual([]);
  });
});

// ─── reorder ─────────────────────────────────────────────────────────────────

describe("reorderArrayItem", () => {
  it("moves an item forward, shifting others", () => {
    expect(reorderArrayItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an item backward, shifting others", () => {
    expect(reorderArrayItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("adjacent move swaps the pair", () => {
    expect(reorderArrayItem(["a", "b", "c"], 1, 2)).toEqual(["a", "c", "b"]);
  });

  it("is a no-op copy when from equals to", () => {
    expect(reorderArrayItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });

  it("is a no-op copy for out-of-range indices", () => {
    expect(reorderArrayItem(["a", "b"], -1, 1)).toEqual(["a", "b"]);
    expect(reorderArrayItem(["a", "b"], 0, 9)).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const original = ["a", "b", "c"];
    reorderArrayItem(original, 0, 2);
    expect(original).toEqual(["a", "b", "c"]);
  });

  it("preserves every item exactly once", () => {
    const result = reorderArrayItem(["a", "b", "c", "d"], 1, 3);
    expect([...result].sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("moveArrayItemUp / moveArrayItemDown", () => {
  it("moves an item up one slot", () => {
    expect(moveArrayItemUp(["a", "b", "c"], 2)).toEqual(["a", "c", "b"]);
  });

  it("moves an item down one slot", () => {
    expect(moveArrayItemDown(["a", "b", "c"], 0)).toEqual(["b", "a", "c"]);
  });

  it("does nothing at the boundaries", () => {
    expect(moveArrayItemUp(["a", "b"], 0)).toEqual(["a", "b"]);
    expect(moveArrayItemDown(["a", "b"], 1)).toEqual(["a", "b"]);
  });
});

// ─── set value (react-hook-form shape) ───────────────────────────────────────

describe("setArrayFieldValue", () => {
  it("sets the array under the field id", () => {
    expect(setArrayFieldValue({}, "tags", ["a"])).toEqual({ tags: ["a"] });
  });

  it("preserves other answers", () => {
    const answers: FormAnswers = { name: "Proj", other: ["keep"] };
    expect(setArrayFieldValue(answers, "tags", ["new"])).toEqual({
      name: "Proj",
      other: ["keep"],
      tags: ["new"],
    });
  });

  it("does not mutate the original answers object", () => {
    const answers: FormAnswers = { name: "Proj" };
    setArrayFieldValue(answers, "tags", ["a"]);
    expect(answers).toEqual({ name: "Proj" });
  });
});

// ─── per-item validation ─────────────────────────────────────────────────────

describe("validateArrayField", () => {
  it("is valid when the field has no rules", () => {
    expect(validateArrayField(tagsField(), { tags: ["", "bad"] })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("accepts a well-formed list", () => {
    const result = validateArrayField(
      tagsField({ required: true, minLength: 2 }),
      { tags: ["alpha", "beta"] },
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails only the offending item, not the whole field", () => {
    // The core acceptance criterion: validation is per item.
    const result = validateArrayField(tagsField({ minLength: 3 }), {
      tags: ["alpha", "no", "beta"],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ index: 1, rule: "minLength" });
    expect(result.errors[0].message).toContain("2");
  });

  it("reports every bad item, not just the first", () => {
    const result = validateArrayField(tagsField({ minLength: 5 }), {
      tags: ["a", "bb", "cccc", "d"],
    });

    expect(result.errors.map((e) => e.index)).toEqual([0, 1, 3]);
    expect(result.valid).toBe(false);
  });

  it("enforces required per item", () => {
    const result = validateArrayField(tagsField({ required: true }), {
      tags: ["alpha", "   "],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ index: 1, rule: "required" });
  });

  it("treats a whitespace-only item as blank", () => {
    const result = validateArrayField(tagsField({ required: true, minLength: 3 }), {
      tags: ["   "],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("required");
  });

  it("does not stack a length error on a blank item", () => {
    // A blank required item should produce exactly one error, not also a
    // minLength failure against the empty string.
    const result = validateArrayField(tagsField({ required: true, minLength: 5 }), {
      tags: [""],
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe("required");
  });

  it("enforces maxLength per item", () => {
    const result = validateArrayField(tagsField({ maxLength: 3 }), {
      tags: ["ok", "toolong"],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ index: 1, rule: "maxLength" });
  });

  it("measures length on the trimmed value", () => {
    const result = validateArrayField(tagsField({ maxLength: 3 }), {
      tags: ["  abc  "],
    });
    expect(result.valid).toBe(true);
  });

  it("applies a pattern per item", () => {
    const field = tagsField({ pattern: "^[a-z]+$" });
    const result = validateArrayField(field, { tags: ["ok", "NOT-LOWER"] });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ index: 1, rule: "pattern" });
  });

  it("requires at least one item when required and empty", () => {
    const result = validateArrayField(tagsField({ required: true }), { tags: [] });

    expect(result.valid).toBe(false);
    // Reported at index -1 (an array-level problem, not a row problem).
    expect(result.errors[0]).toMatchObject({ index: -1, rule: "required" });
  });

  it("enforces minItems on the array length", () => {
    const result = validateArrayField(tagsField({ minItems: 3 }), { tags: ["a"] });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ index: -1, rule: "minItems" });
  });

  it("enforces maxItems on the array length", () => {
    const result = validateArrayField(tagsField({ maxItems: 2 }), {
      tags: ["a", "b", "c"],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatchObject({ index: -1, rule: "maxItems" });
  });

  it("wraps a bare string as a single item", () => {
    const result = validateArrayField(tagsField({ required: true }), {
      tags: "solo",
    });
    expect(result.valid).toBe(true);
  });

  it("treats a missing answer as an empty list", () => {
    const result = validateArrayField(tagsField({ required: true }), {});
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe("required");
  });

  it("does not mutate the answers it validates", () => {
    const answers: FormAnswers = { tags: ["a"] };
    validateArrayField(tagsField({ minItems: 5 }), answers);
    expect(answers).toEqual({ tags: ["a"] });
  });
});

// ─── error shape ─────────────────────────────────────────────────────────────

describe("toFieldValidationErrors", () => {
  it("suffixes the field id with the item index", () => {
    const result = validateArrayField(tagsField({ minLength: 3 }), {
      tags: ["no"],
    });

    expect(toFieldValidationErrors("tags", result)).toEqual([
      expect.objectContaining({ fieldId: "tags[0]", rule: "minLength" }),
    ]);
  });

  it("leaves array-level errors on the bare field id", () => {
    const result = validateArrayField(tagsField({ minItems: 2 }), { tags: [] });

    expect(toFieldValidationErrors("tags", result)[0].fieldId).toBe("tags");
  });

  it("produces the same shape as scalar field errors", () => {
    const result = validateArrayField(tagsField({ required: true }), { tags: [] });
    const [error] = toFieldValidationErrors("tags", result);

    expect(error).toEqual({
      fieldId: "tags",
      rule: "required",
      message: expect.any(String),
    });
  });

  it("returns an empty array when valid", () => {
    const result = validateArrayField(tagsField(), { tags: ["a"] });
    expect(toFieldValidationErrors("tags", result)).toEqual([]);
  });
});

// ─── add/remove/reorder + validation integration ─────────────────────────────

describe("array mutations compose with validation", () => {
  it("re-validates cleanly after a reorder", () => {
    const field = tagsField({ minLength: 3 });
    const answers = setArrayFieldValue({}, "tags", ["alpha", "no"]);

    const reordered = setArrayFieldValue(answers, "tags", reorderArrayItem(answers.tags as string[], 1, 0));
    const result = validateArrayField(field, reordered);

    // Reordering must not change which item is invalid, only its position.
    expect(result.valid).toBe(false);
    expect(result.errors[0].index).toBe(0);
  });

  it("becomes valid once the offending item is removed", () => {
    const field = tagsField({ minLength: 3 });
    const answers = setArrayFieldValue({}, "tags", ["alpha", "no"]);

    const pruned = setArrayFieldValue(answers, "tags", removeArrayItem(answers.tags as string[], 1));
    expect(validateArrayField(field, pruned).valid).toBe(true);
  });

  it("a newly added blank item fails required validation", () => {
    const field = tagsField({ required: true });
    const answers = setArrayFieldValue({}, "tags", ["alpha"]);
    const withBlank = setArrayFieldValue(answers, "tags", addArrayItem(answers.tags as string[], ""));

    const result = validateArrayField(field, withBlank);
    expect(result.valid).toBe(false);
    expect(result.errors[0].index).toBe(1);
  });
});