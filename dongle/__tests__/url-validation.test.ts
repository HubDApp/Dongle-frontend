import { describe, it, expect } from "vitest";
import { normalizeUrl, extractDomain, encodeUrlForHtml, sanitizeAndEncodeUrl } from "@/lib/url";
import { validateRepositoryUrl, normalizeRepositoryUrl } from "@/lib/repository";

describe("normalizeUrl - Basic Validation", () => {
  it("accepts valid http and https URLs", () => {
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

describe("normalizeUrl - XSS Payloads & OWASP Test Vectors", () => {
  it("rejects direct javascript: protocol vectors", () => {
    expect(() => normalizeUrl("javascript:alert(1)")).toThrow();
    expect(() => normalizeUrl("javascript:alert('XSS')")).toThrow();
    expect(() => normalizeUrl("javascript:eval('alert(1)')")).toThrow();
  });

  it("rejects data: protocol vectors", () => {
    expect(() => normalizeUrl("data:text/html,<script>alert(1)</script>")).toThrow();
    expect(() => normalizeUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toThrow();
  });

  it("rejects vbscript:, file:, blob: and other non-http/https schemes", () => {
    expect(() => normalizeUrl("vbscript:msgbox(1)")).toThrow();
    expect(() => normalizeUrl("file:///etc/passwd")).toThrow();
    expect(() => normalizeUrl("blob:https://example.com/uuid")).toThrow();
    expect(() => normalizeUrl("ftp://example.com")).toThrow();
  });

  it("rejects null-byte and whitespace obfuscated javascript: schemes", () => {
    expect(() => normalizeUrl("java\0script:alert(1)")).toThrow();
    expect(() => normalizeUrl("java\r\nscript:alert(1)")).toThrow();
    expect(() => normalizeUrl(" java script:alert(1)")).toThrow();
  });

  it("rejects HTML entity-encoded scheme bypass vectors", () => {
    expect(() => normalizeUrl("javascript&#x3A;alert(1)")).toThrow();
    expect(() => normalizeUrl("javascript&colon;alert(1)")).toThrow();
  });

  it("sanitizes HTML tags and script injections embedded in URLs", () => {
    expect(() => normalizeUrl("<script>alert(1)</script>")).toThrow();
    expect(() => normalizeUrl("https://example.com/<script>alert(1)</script>")).not.toThrow();
    const cleanUrl = normalizeUrl("https://example.com/<script>alert(1)</script>");
    expect(cleanUrl).not.toContain("<script>");
  });
});

describe("encodeUrlForHtml & sanitizeAndEncodeUrl", () => {
  it("encodes HTML special characters to prevent attribute breakout XSS", () => {
    const rawUrl = 'https://example.com/" onload="alert(1)"';
    const encoded = encodeUrlForHtml(rawUrl);
    expect(encoded).not.toContain('"');
    expect(encoded).toContain("&quot;");
  });

  it("sanitizeAndEncodeUrl returns safe HTML-encoded URL or empty string for invalid payload", () => {
    expect(sanitizeAndEncodeUrl("javascript:alert(1)")).toBe("");
    const result = sanitizeAndEncodeUrl('https://example.com/test?a=1&b=2');
    expect(result).toBe("https://example.com/test?a=1&amp;b=2");
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

  it("accepts GitLab and Bitbucket URLs", () => {
    expect(validateRepositoryUrl("https://gitlab.com/group/project").isValid).toBe(true);
    expect(validateRepositoryUrl("https://bitbucket.org/team/repo").isValid).toBe(true);
  });

  it("accepts www hosts and URLs without a protocol", () => {
    const www = validateRepositoryUrl("https://www.github.com/owner/repo");
    expect(www.isValid).toBe(true);
    expect(www.metadata).toEqual({ host: "github", owner: "owner", repo: "repo" });

    const bare = validateRepositoryUrl("github.com/owner/repo");
    expect(bare.isValid).toBe(true);
  });

  it("rejects a URL missing the repository name", () => {
    const result = validateRepositoryUrl("https://github.com/owner");
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/owner\/repo/i);
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