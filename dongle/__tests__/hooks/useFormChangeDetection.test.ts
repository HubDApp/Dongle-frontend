import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormChangeDetection } from "@/hooks/useFormChangeDetection";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHook(
  initial: Record<string, unknown>,
  current: Record<string, unknown>,
  ignoreFields?: string[],
) {
  return renderHook(
    ({ initialValues, currentValues, ignore }) =>
      useFormChangeDetection({
        initialValues,
        currentValues,
        ignoreFields: ignore,
      }),
    {
      initialProps: {
        initialValues: initial,
        currentValues: current,
        ignore: ignoreFields,
      },
    },
  );
}

// ---------------------------------------------------------------------------
// Core dirty detection
// ---------------------------------------------------------------------------

describe("useFormChangeDetection – initial state", () => {
  it("is not dirty when current values equal initial values", () => {
    const { result } = makeHook(
      { name: "Project A" },
      { name: "Project A" },
    );
    expect(result.current.isDirty).toBe(false);
  });

  it("is not dirty for empty objects", () => {
    const { result } = makeHook({}, {});
    expect(result.current.isDirty).toBe(false);
  });

  it("is not dirty for empty arrays", () => {
    const { result } = makeHook({ tags: [] }, { tags: [] });
    expect(result.current.isDirty).toBe(false);
  });
});

describe("useFormChangeDetection – simple field modification", () => {
  it("is dirty when a string field changes", () => {
    const { result } = makeHook(
      { name: "Project A" },
      { name: "Project B" },
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("is dirty when a number field changes", () => {
    const { result } = makeHook({ count: 0 }, { count: 1 });
    expect(result.current.isDirty).toBe(true);
  });

  it("is dirty when a boolean field changes", () => {
    const { result } = makeHook({ active: false }, { active: true });
    expect(result.current.isDirty).toBe(true);
  });

  it("is dirty when a null field becomes a value", () => {
    const { result } = makeHook({ url: null }, { url: "https://example.com" });
    expect(result.current.isDirty).toBe(true);
  });

  it("is dirty when a defined field becomes undefined", () => {
    const { result } = makeHook(
      { field: "value" } as Record<string, unknown>,
      { field: undefined } as Record<string, unknown>,
    );
    expect(result.current.isDirty).toBe(true);
  });
});

describe("useFormChangeDetection – modification then reset", () => {
  it("is not dirty when a modified field is reset to its original value", () => {
    const { result, rerender } = renderHook(
      (props: { current: Record<string, unknown> }) =>
        useFormChangeDetection({
          initialValues: { name: "Project A" },
          currentValues: props.current,
        }),
      { initialProps: { current: { name: "Project B" } } },
    );

    expect(result.current.isDirty).toBe(true);

    rerender({ current: { name: "Project A" } });
    expect(result.current.isDirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------

describe("useFormChangeDetection – nested objects", () => {
  it("is dirty when a nested field changes", () => {
    const { result } = makeHook(
      { meta: { title: "A" } },
      { meta: { title: "B" } },
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("is not dirty when a nested field is reset to original", () => {
    const { result, rerender } = renderHook(
      (props: { current: Record<string, unknown> }) =>
        useFormChangeDetection({
          initialValues: { meta: { title: "A" } },
          currentValues: props.current,
        }),
      { initialProps: { current: { meta: { title: "B" } } } },
    );

    expect(result.current.isDirty).toBe(true);
    rerender({ current: { meta: { title: "A" } } });
    expect(result.current.isDirty).toBe(false);
  });

  it("treats independently created equivalent objects as equal", () => {
    const { result } = makeHook(
      { config: { key: "value" } },
      { config: { key: "value" } },
    );
    expect(result.current.isDirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------

describe("useFormChangeDetection – arrays", () => {
  it("is dirty when an item is added to an array", () => {
    const { result } = makeHook(
      { tags: ["a", "b"] },
      { tags: ["a", "b", "c"] },
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("is dirty when an item is removed from an array", () => {
    const { result } = makeHook({ tags: ["a", "b"] }, { tags: ["a"] });
    expect(result.current.isDirty).toBe(true);
  });

  it("is dirty when an array item value changes", () => {
    const { result } = makeHook(
      { tags: ["a", "b"] },
      { tags: ["a", "changed"] },
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("is not dirty when an array is restored to its original state", () => {
    const { result, rerender } = renderHook(
      (props: { current: Record<string, unknown> }) =>
        useFormChangeDetection({
          initialValues: { tags: ["a", "b"] },
          currentValues: props.current,
        }),
      { initialProps: { current: { tags: ["a", "b", "c"] } } },
    );

    expect(result.current.isDirty).toBe(true);
    rerender({ current: { tags: ["a", "b"] } });
    expect(result.current.isDirty).toBe(false);
  });

  it("is dirty when a nested array object item changes", () => {
    const { result } = makeHook(
      { addresses: [{ value: "CAAA" }] },
      { addresses: [{ value: "CBBB" }] },
    );
    expect(result.current.isDirty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Ignored fields
// ---------------------------------------------------------------------------

describe("useFormChangeDetection – ignored fields", () => {
  it("is not dirty when only an ignored field changes", () => {
    const { result } = makeHook(
      { name: "A", updatedAt: "2024-01-01" },
      { name: "A", updatedAt: "2025-12-31" },
      ["updatedAt"],
    );
    expect(result.current.isDirty).toBe(false);
  });

  it("is dirty when a non-ignored field changes alongside an ignored one", () => {
    const { result } = makeHook(
      { name: "A", updatedAt: "2024-01-01" },
      { name: "B", updatedAt: "2025-12-31" },
      ["updatedAt"],
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("supports multiple ignored fields", () => {
    const { result } = makeHook(
      { name: "A", updatedAt: "old", internalFlag: true },
      { name: "A", updatedAt: "new", internalFlag: false },
      ["updatedAt", "internalFlag"],
    );
    expect(result.current.isDirty).toBe(false);
  });

  it("supports nested ignored fields", () => {
    const { result } = makeHook(
      { meta: { title: "A", ts: "old" } },
      { meta: { title: "A", ts: "new" } },
      ["meta.ts"],
    );
    expect(result.current.isDirty).toBe(false);
  });

  it("is dirty when a non-ignored nested field changes", () => {
    const { result } = makeHook(
      { meta: { title: "A", ts: "old" } },
      { meta: { title: "B", ts: "new" } },
      ["meta.ts"],
    );
    expect(result.current.isDirty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resetBaseline
// ---------------------------------------------------------------------------

describe("useFormChangeDetection – resetBaseline", () => {
  it("clears dirty state after a successful save", () => {
    const saved = { name: "Project B" };
    const { result } = renderHook(
      (props: { current: Record<string, unknown> }) =>
        useFormChangeDetection({
          initialValues: { name: "Project A" },
          currentValues: props.current,
        }),
      { initialProps: { current: saved } },
    );

    expect(result.current.isDirty).toBe(true);

    // Simulate: save succeeded → establish new baseline from current values
    act(() => {
      result.current.resetBaseline(saved as Record<string, unknown>);
    });

    // isDirty re-derives from the new baseline
    expect(result.current.isDirty).toBe(false);
  });

  it("uses currentValues as new baseline when called with no argument", () => {
    const { result } = renderHook(() =>
      useFormChangeDetection({
        initialValues: { name: "Project A" },
        currentValues: { name: "Project B" },
      }),
    );

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.resetBaseline(); // no arg → use current "Project B"
    });

    expect(result.current.isDirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Null / undefined / empty edge cases
// ---------------------------------------------------------------------------

describe("useFormChangeDetection – edge cases", () => {
  it("null === null is not dirty", () => {
    const { result } = makeHook({ url: null }, { url: null });
    expect(result.current.isDirty).toBe(false);
  });

  it("undefined === undefined is not dirty", () => {
    const { result } = makeHook(
      { url: undefined } as Record<string, unknown>,
      { url: undefined } as Record<string, unknown>,
    );
    expect(result.current.isDirty).toBe(false);
  });

  it("empty string !== null is dirty", () => {
    const { result } = makeHook(
      { field: null },
      { field: "" },
    );
    expect(result.current.isDirty).toBe(true);
  });

  it("empty object vs empty object is not dirty", () => {
    const { result } = makeHook({ meta: {} }, { meta: {} });
    expect(result.current.isDirty).toBe(false);
  });

  it("empty array vs empty array is not dirty", () => {
    const { result } = makeHook({ tags: [] }, { tags: [] });
    expect(result.current.isDirty).toBe(false);
  });
});
