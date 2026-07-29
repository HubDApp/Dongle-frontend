import { describe, it, expect } from "vitest";
import { normalizeUrl, extractDomain } from "@/lib/url";

describe("URL Utilities", () => {
  describe("normalizeUrl", () => {
    it("should allow valid http and https URLs", () => {
      expect(normalizeUrl("https://example.com")).toBe("https://example.com");
      expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("should prepend https:// if protocol is missing", () => {
      expect(normalizeUrl("example.com")).toBe("https://example.com");
      expect(normalizeUrl("sub.example.com/path?query=1")).toBe("https://sub.example.com/path?query=1");
    });

    it("should reject javascript:, data:, and other unsupported protocols", () => {
      expect(() => normalizeUrl("javascript:alert(1)")).toThrow(/not supported/);
      expect(() => normalizeUrl("data:text/html,hello")).toThrow(/not supported/);
      expect(() => normalizeUrl("ftp://example.com")).toThrow(/not supported/);
    });

    it("should normalize URL consistently (strip trailing slash for root paths)", () => {
      expect(normalizeUrl("https://example.com/")).toBe("https://example.com");
      expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path/");
    });
  });

  describe("extractDomain", () => {
    it("should extract domain and strip www.", () => {
      expect(extractDomain("https://www.example.com")).toBe("example.com");
      expect(extractDomain("example.com/some/path")).toBe("example.com");
      expect(extractDomain("http://sub.example.com")).toBe("sub.example.com");
    });

    it("should return empty string for invalid URL", () => {
      expect(extractDomain("javascript:alert(1)")).toBe("");
    });
  });
});
