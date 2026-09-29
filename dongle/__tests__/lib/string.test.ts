/**
 * Unit tests for string utility functions
 */

import { describe, it, expect } from "vitest";
import {
  isBlank,
  normalizeWhitespace,
  truncate,
  capitalize,
  toKebabCase,
} from "@/lib/string";

describe("String Utilities", () => {
  describe("isBlank", () => {
    it("should return true for null or undefined", () => {
      expect(isBlank(null)).toBe(true);
      expect(isBlank(undefined)).toBe(true);
    });

    it("should return true for empty or whitespace-only strings", () => {
      expect(isBlank("")).toBe(true);
      expect(isBlank(" ")).toBe(true);
      expect(isBlank("   ")).toBe(true);
      expect(isBlank("\t")).toBe(true);
      expect(isBlank("\n")).toBe(true);
    });

    it("should return false for strings with content", () => {
      expect(isBlank("hello")).toBe(false);
      expect(isBlank(" hello ")).toBe(false);
      expect(isBlank("0")).toBe(false);
    });
  });

  describe("normalizeWhitespace", () => {
    it("should trim leading and trailing whitespace", () => {
      expect(normalizeWhitespace("  hello  ")).toBe("hello");
      expect(normalizeWhitespace("\thello\n")).toBe("hello");
    });

    it("should collapse multiple spaces to single space", () => {
      expect(normalizeWhitespace("hello   world")).toBe("hello world");
      expect(normalizeWhitespace("hello\t\tworld")).toBe("hello world");
      expect(normalizeWhitespace("hello\n\nworld")).toBe("hello world");
    });

    it("should preserve single spaces between words", () => {
      expect(normalizeWhitespace("hello world foo")).toBe("hello world foo");
    });

    it("should handle mixed whitespace", () => {
      expect(normalizeWhitespace("  hello \t world  \n foo  ")).toBe("hello world foo");
    });

    it("should handle empty or whitespace-only strings", () => {
      expect(normalizeWhitespace("")).toBe("");
      expect(normalizeWhitespace("   ")).toBe("");
    });
  });

  describe("truncate", () => {
    it("should return full string if under max length", () => {
      expect(truncate("hello", 10)).toBe("hello");
      expect(truncate("hello", 5)).toBe("hello");
    });

    it("should truncate and add suffix for long strings", () => {
      expect(truncate("hello world", 8)).toBe("hello...");
      expect(truncate("hello world", 10)).toBe("hello w...");
    });

    it("should use custom suffix", () => {
      expect(truncate("hello world", 8, "…")).toBe("hello w…");
      expect(truncate("hello world", 7, "***")).toBe("hell***");
    });

    it("should handle edge cases", () => {
      expect(truncate("hello", 1)).toBe(".");
      expect(truncate("hello", 0)).toBe("");
      expect(truncate("hello", 3)).toBe("");
    });

    it("should not truncate if suffix is too long", () => {
      const suffix = "...";
      expect(truncate("hello", 3, suffix)).toBe(suffix.slice(0, 3));
    });

    it("should handle very short strings", () => {
      expect(truncate("a", 5)).toBe("a");
      expect(truncate("ab", 1)).toBe(".");
    });
  });

  describe("capitalize", () => {
    it("should capitalize first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
      expect(capitalize("world")).toBe("World");
    });

    it("should preserve rest of string", () => {
      expect(capitalize("hELLO")).toBe("HELLO");
      expect(capitalize("heLLo")).toBe("HeLLo");
    });

    it("should handle single character", () => {
      expect(capitalize("a")).toBe("A");
      expect(capitalize("z")).toBe("Z");
    });

    it("should handle empty string", () => {
      expect(capitalize("")).toBe("");
    });

    it("should handle strings starting with non-letter", () => {
      expect(capitalize("123hello")).toBe("123hello");
      expect(capitalize("_hello")).toBe("_hello");
    });
  });

  describe("toKebabCase", () => {
    it("should convert strings to kebab-case", () => {
      expect(toKebabCase("hello world")).toBe("hello-world");
      expect(toKebabCase("Hello World")).toBe("hello-world");
      expect(toKebabCase("helloWorld")).toBe("hello-world");
    });

    it("should normalize whitespace first", () => {
      expect(toKebabCase("hello   world")).toBe("hello-world");
      expect(toKebabCase("  hello world  ")).toBe("hello-world");
    });

    it("should remove special characters", () => {
      expect(toKebabCase("hello@world")).toBe("hello-world");
      expect(toKebabCase("hello_world")).toBe("hello-world");
      expect(toKebabCase("hello.world")).toBe("hello-world");
    });

    it("should handle multiple special characters", () => {
      expect(toKebabCase("hello!!!world")).toBe("hello-world");
      expect(toKebabCase("hello@@@world")).toBe("hello-world");
    });

    it("should remove leading and trailing dashes", () => {
      expect(toKebabCase("-hello-")).toBe("hello");
      expect(toKebabCase("--hello--")).toBe("hello");
    });

    it("should handle edge cases", () => {
      expect(toKebabCase("")).toBe("");
      expect(toKebabCase("   ")).toBe("");
      expect(toKebabCase("---")).toBe("");
      expect(toKebabCase("a")).toBe("a");
    });

    it("should preserve numbers", () => {
      expect(toKebabCase("Hello123World")).toBe("hello123-world");
      expect(toKebabCase("hello 456 world")).toBe("hello-456-world");
    });

    it("should handle real-world examples", () => {
      expect(toKebabCase("React Hook Form")).toBe("react-hook-form");
      expect(toKebabCase("My_Component_Name")).toBe("my-component-name");
      expect(toKebabCase("API-Key-V2")).toBe("api-key-v2");
    });
  });
});
