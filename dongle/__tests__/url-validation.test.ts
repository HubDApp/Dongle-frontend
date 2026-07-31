import { describe, it, expect } from "vitest";
import { normalizeUrl, extractDomain } from "@/lib/url";
import { validateRepositoryUrl, normalizeRepositoryUrl } from "@/lib/repository";

describe("normalizeUrl", () => {
  it("rejects javascript: protocol", () => {
    expect(() => normalizeUrl("javascript:alert(1)")).toThrow();
  });

  it("rejects data: protocol", () => {
    expect(() => normalizeUrl("data:text/html,<script>alert(1)</script>")).toThrow();
  });

  it("rejects other unsupported protocols", () => {
    expect(() => normalizeUrl("ftp://example.com")).toThrow();
    expect(() => normalizeUrl("file:///etc/passwd")).toThrow();
  });

  it("accepts http and https", () => {
    expect(() => normalizeUrl("http://example.com")).not.toThrow();
    expect(() => normalizeUrl("https://example.com")).not.toThrow();
  });

  it("prepends https:// when no protocol is given", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });

  it("normalizes consistently regardless of trailing slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe(normalizeUrl("https://example.com"));
  });

  it("preserves path, query, and hash", () => {
    const result = normalizeUrl("https://example.com/path?query=1#hash");
    expect(result).toBe("https://example.com/path?query=1#hash");
  });

  it("throws on empty input", () => {
    expect(() => normalizeUrl("")).toThrow();
    expect(() => normalizeUrl("   ")).toThrow();
  });

  it("throws on malformed URLs", () => {
    expect(() => normalizeUrl("not a url")).toThrow();
  });
});

describe("extractDomain", () => {
  it("extracts the domain from a full URL", () => {
    expect(extractDomain("https://example.com/some/path")).toBe("example.com");
  });

  it("strips a leading www.", () => {
    expect(extractDomain("https://www.example.com")).toBe("example.com");
  });

  it("returns empty string for invalid input rather than throwing", () => {
    expect(extractDomain("javascript:alert(1)")).toBe("");
    expect(extractDomain("")).toBe("");
  });

  it("is stable regardless of protocol prefix presence", () => {
    expect(extractDomain("example.com")).toBe(extractDomain("https://example.com"));
  });
});

describe("validateRepositoryUrl", () => {
  it("accepts a valid GitHub URL", () => {
    const result = validateRepositoryUrl("https://github.com/owner/repo");
    expect(result.isValid).toBe(true);
    expect(result.metadata).toEqual({ host: "github", owner: "owner", repo: "repo" });
  });

  it("rejects unsupported hosts", () => {
    const result = validateRepositoryUrl("https://notgithub.com/owner/repo");
    expect(result.isValid).toBe(false);
  });

  it("rejects javascript: protocol", () => {
    const result = validateRepositoryUrl("javascript:alert(1)");
    expect(result.isValid).toBe(false);
  });

  it("treats an empty string as valid (optional field)", () => {
    const result = validateRepositoryUrl("");
    expect(result.isValid).toBe(true);
  });

  it("strips a trailing .git suffix", () => {
    const result = validateRepositoryUrl("https://github.com/owner/repo.git");
    expect(result.metadata?.repo).toBe("repo");
  });
});

describe("normalizeRepositoryUrl", () => {
  it("normalizes to a canonical https URL", () => {
    expect(normalizeRepositoryUrl("github.com/owner/repo")).toBe("https://github.com/owner/repo");
  });
});