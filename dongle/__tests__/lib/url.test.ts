import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  extractDomain,
  encodeUrlForHtml,
  sanitizeAndEncodeUrl,
} from "@/lib/url";

describe("URL Utilities with DOMPurify & XSS Protection", () => {
  describe("normalizeUrl", () => {
    it("should allow valid http and https URLs", () => {
      expect(normalizeUrl("https://example.com")).toBe("https://example.com");
      expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("should prepend https:// if protocol is missing", () => {
      expect(normalizeUrl("example.com")).toBe("https://example.com");
      expect(normalizeUrl("sub.example.com/path?query=1")).toBe("https://sub.example.com/path?query=1");
    });

    it("should reject javascript:, data:, vbscript:, and file: protocols", () => {
      expect(() => normalizeUrl("javascript:alert(1)")).toThrow(/not supported/);
      expect(() => normalizeUrl("data:text/html,hello")).toThrow(/not supported/);
      expect(() => normalizeUrl("vbscript:msgbox(1)")).toThrow(/not supported/);
      expect(() => normalizeUrl("file:///etc/passwd")).toThrow(/not supported/);
      expect(() => normalizeUrl("ftp://example.com")).toThrow(/not supported/);
    });

    it("should reject OWASP XSS test vectors and obfuscated schemes", () => {
      // Obfuscated null-byte / control chars
      expect(() => normalizeUrl("java\0script:alert(1)")).toThrow();
      expect(() => normalizeUrl("java\r\nscript:alert(1)")).toThrow();
      // HTML entity encoded scheme
      expect(() => normalizeUrl("javascript&#x3A;alert(1)")).toThrow();
      expect(() => normalizeUrl("javascript&colon;alert(1)")).toThrow();
    });

    it("should sanitize embedded HTML script tags via DOMPurify", () => {
      const sanitized = normalizeUrl("https://example.com/path?<script>alert(1)</script>");
      expect(sanitized).not.toContain("<script>");
      expect(sanitized.startsWith("https://example.com")).toBe(true);
    });

    it("should normalize URL consistently (strip trailing slash for root paths)", () => {
      expect(normalizeUrl("https://example.com/")).toBe("https://example.com");
      expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path/");
    });
  });

  describe("HTML Encoding & Rendering Safety", () => {
    it("encodeUrlForHtml converts dangerous HTML characters to entities", () => {
      const input = 'https://example.com/" onmouseover="alert(1)"';
      const encoded = encodeUrlForHtml(input);
      expect(encoded).toBe("https://example.com/&quot; onmouseover=&quot;alert(1)&quot;");
    });

    it("sanitizeAndEncodeUrl safely normalizes and encodes valid URLs", () => {
      const input = "https://example.com/search?q=1&category=test";
      expect(sanitizeAndEncodeUrl(input)).toBe("https://example.com/search?q=1&amp;category=test");
    });

    it("sanitizeAndEncodeUrl returns empty string for XSS vectors", () => {
      expect(sanitizeAndEncodeUrl("javascript:alert(1)")).toBe("");
      expect(sanitizeAndEncodeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
    });
  });

  describe("extractDomain", () => {
    it("should extract domain and strip www.", () => {
      expect(extractDomain("https://www.example.com")).toBe("example.com");
      expect(extractDomain("example.com/some/path")).toBe("example.com");
      expect(extractDomain("http://sub.example.com")).toBe("sub.example.com");
    });

    it("should return empty string for invalid or dangerous URL", () => {
      expect(extractDomain("javascript:alert(1)")).toBe("");
      expect(extractDomain("data:text/html,hello")).toBe("");
    });
  });
});
