import { describe, expect, it } from "vitest";
import { chunk, compact, groupBy, unique } from "@/lib/array";
import { capitalize, isBlank, normalizeWhitespace, toKebabCase, truncate } from "@/lib/string";
import { hasLengthBetween, hasMinLength, isRequired, isValidEmail, isValidHttpUrl } from "@/lib/validation";

describe("common utility libraries", () => {
  it("provides predictable string formatting", () => {
    expect(normalizeWhitespace("  hello   world ")).toBe("hello world");
    expect(truncate("hello world", 8)).toBe("hello...");
    expect(capitalize("dongle")).toBe("Dongle");
    expect(toKebabCase("Hello, Stellar World")).toBe("hello-stellar-world");
    expect(isBlank("  ")).toBe(true);
  });

  it("provides reusable validation helpers", () => {
    expect(isRequired("value")).toBe(true);
    expect(hasMinLength("  hello ", 5)).toBe(true);
    expect(hasLengthBetween("hello", 3, 5)).toBe(true);
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidHttpUrl("https://example.com")).toBe(true);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
  });

  it("provides immutable array operations", () => {
    expect(unique(["a", "a", "b"])).toEqual(["a", "b"]);
    expect(compact(["a", "", null, "b"])).toEqual(["a", "b"]);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(groupBy(["ant", "apple", "bee"], (value) => value[0])).toEqual({
      a: ["ant", "apple"],
      b: ["bee"],
    });
  });
});
