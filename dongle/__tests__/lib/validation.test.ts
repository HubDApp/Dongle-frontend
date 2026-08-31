/**
 * Unit tests for validation utility functions
 */

import { describe, it, expect } from "vitest";
import {
  isRequired,
  hasLengthBetween,
  hasMinLength,
  isValidEmail,
  isValidHttpUrl,
} from "@/lib/validation";

describe("Validation Utilities", () => {
  describe("isRequired", () => {
    it("should return true for non-empty strings", () => {
      expect(isRequired("hello")).toBe(true);
      expect(isRequired("0")).toBe(true);
      expect(isRequired(" a ")).toBe(true);
    });

    it("should return false for empty or whitespace strings", () => {
      expect(isRequired("")).toBe(false);
      expect(isRequired("   ")).toBe(false);
      expect(isRequired("\t")).toBe(false);
    });

    it("should return false for null or undefined", () => {
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
    });
  });

  describe("hasLengthBetween", () => {
    it("should return true for strings within range", () => {
      expect(hasLengthBetween("hello", 3, 10)).toBe(true);
      expect(hasLengthBetween("hello", 5, 5)).toBe(true);
      expect(hasLengthBetween("hello", 1, 100)).toBe(true);
    });

    it("should return false for strings outside range", () => {
      expect(hasLengthBetween("hi", 3, 10)).toBe(false);
      expect(hasLengthBetween("hello world!", 3, 10)).toBe(false);
    });

    it("should trim whitespace before checking", () => {
      expect(hasLengthBetween("  hello  ", 5, 5)).toBe(true);
      expect(hasLengthBetween("  hi  ", 2, 2)).toBe(true);
    });

    it("should return false for null or undefined", () => {
      expect(hasLengthBetween(null, 1, 10)).toBe(false);
      expect(hasLengthBetween(undefined, 1, 10)).toBe(false);
    });

    it("should return false for empty or whitespace strings", () => {
      expect(hasLengthBetween("", 1, 10)).toBe(false);
      expect(hasLengthBetween("   ", 1, 10)).toBe(false);
    });
  });

  describe("hasMinLength", () => {
    it("should return true for strings with at least min length", () => {
      expect(hasMinLength("hello", 1)).toBe(true);
      expect(hasMinLength("hello", 5)).toBe(true);
      expect(hasMinLength("hello world", 6)).toBe(true);
    });

    it("should return false for strings shorter than min", () => {
      expect(hasMinLength("hi", 3)).toBe(false);
      expect(hasMinLength("hello", 6)).toBe(false);
    });

    it("should trim whitespace before checking", () => {
      expect(hasMinLength("  hello  ", 5)).toBe(true);
      expect(hasMinLength("  hi  ", 3)).toBe(false);
    });

    it("should return false for null or undefined", () => {
      expect(hasMinLength(null, 1)).toBe(false);
      expect(hasMinLength(undefined, 1)).toBe(false);
    });

    it("should return false for empty or whitespace strings", () => {
      expect(hasMinLength("", 1)).toBe(false);
      expect(hasMinLength("   ", 1)).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    it("should accept valid email addresses", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("first.last@example.co.uk")).toBe(true);
      expect(isValidEmail("user+tag@example.com")).toBe(true);
      expect(isValidEmail("123@example.com")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("invalid@")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user @example.com")).toBe(false);
    });

    it("should reject emails without TLD", () => {
      expect(isValidEmail("user@localhost")).toBe(false);
    });

    it("should trim whitespace", () => {
      expect(isValidEmail("  user@example.com  ")).toBe(true);
    });

    it("should return false for null or undefined", () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("   ")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isValidEmail(123 as any)).toBe(false);
      expect(isValidEmail({} as any)).toBe(false);
    });
  });

  describe("isValidHttpUrl", () => {
    it("should accept valid HTTP URLs", () => {
      expect(isValidHttpUrl("http://example.com")).toBe(true);
      expect(isValidHttpUrl("https://example.com")).toBe(true);
      expect(isValidHttpUrl("https://example.com/path")).toBe(true);
      expect(isValidHttpUrl("https://subdomain.example.com")).toBe(true);
      expect(isValidHttpUrl("https://example.com:8080/path?query=value")).toBe(true);
    });

    it("should reject non-HTTP protocols", () => {
      expect(isValidHttpUrl("ftp://example.com")).toBe(false);
      expect(isValidHttpUrl("file:///path/to/file")).toBe(false);
      expect(isValidHttpUrl("javascript:alert('hi')")).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(isValidHttpUrl("not a url")).toBe(false);
      expect(isValidHttpUrl("example.com")).toBe(false);
      expect(isValidHttpUrl("/path/only")).toBe(false);
    });

    it("should trim whitespace", () => {
      expect(isValidHttpUrl("  https://example.com  ")).toBe(true);
    });

    it("should return false for null or undefined", () => {
      expect(isValidHttpUrl(null)).toBe(false);
      expect(isValidHttpUrl(undefined)).toBe(false);
    });

    it("should return false for empty or blank strings", () => {
      expect(isValidHttpUrl("")).toBe(false);
      expect(isValidHttpUrl("   ")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isValidHttpUrl(123 as any)).toBe(false);
      expect(isValidHttpUrl({} as any)).toBe(false);
    });

    it("should handle trailing slashes", () => {
      expect(isValidHttpUrl("https://example.com/")).toBe(true);
      expect(isValidHttpUrl("https://example.com/path/")).toBe(true);
    });
  });
});
