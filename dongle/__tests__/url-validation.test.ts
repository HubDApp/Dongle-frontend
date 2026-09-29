import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  extractDomain,
  encodeUrlForHtml,
  sanitizeAndEncodeUrl,
  isValidUrl,
  validateUrl,
  addProtocolIfMissing,
  removeTrailingSlash,
  getUrlHostname,
} from "@/lib/url";
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

describe("isValidUrl - URL Format Validation", () => {
  it("returns true for standard URLs with https and http", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://example.org/api/v1")).toBe(true);
    expect(isValidUrl("https://subdomain.hubdapp.io/path?query=test#section")).toBe(true);
  });

  it("returns true for valid domains without protocol", () => {
    expect(isValidUrl("example.com")).toBe(true);
    expect(isValidUrl("github.com/HubDApp/Dongle-frontend")).toBe(true);
  });

  it("returns true for localhost and local IP development URLs", () => {
    expect(isValidUrl("http://localhost:3000")).toBe(true);
    expect(isValidUrl("http://127.0.0.1:8080/dashboard")).toBe(true);
  });

  it("returns false for invalid strings and empty inputs", () => {
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("   ")).toBe(false);
    expect(isValidUrl("random non url string")).toBe(false);
    expect(isValidUrl(":::://bad")).toBe(false);
  });

  it("returns false for dangerous or non-http protocols", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
    expect(isValidUrl("data:text/html,<div>test</div>")).toBe(false);
    expect(isValidUrl("file:///etc/passwd")).toBe(false);
    expect(isValidUrl("ftp://ftp.example.com")).toBe(false);
  });
});

describe("addProtocolIfMissing", () => {
  it("adds https:// when protocol is missing", () => {
    expect(addProtocolIfMissing("example.com")).toBe("https://example.com");
    expect(addProtocolIfMissing("sub.domain.org/path")).toBe("https://sub.domain.org/path");
  });

  it("leaves existing http or https intact", () => {
    expect(addProtocolIfMissing("http://example.com")).toBe("http://example.com");
    expect(addProtocolIfMissing("https://example.com")).toBe("https://example.com");
  });

  it("supports custom default protocol", () => {
    expect(addProtocolIfMissing("example.com", "http://")).toBe("http://example.com");
    expect(addProtocolIfMissing("example.com", "http")).toBe("http://example.com");
  });

  it("returns empty string on empty input", () => {
    expect(addProtocolIfMissing("")).toBe("");
  });
});

describe("removeTrailingSlash", () => {
  it("removes trailing slashes from path and domain URLs", () => {
    expect(removeTrailingSlash("https://example.com/")).toBe("https://example.com");
    expect(removeTrailingSlash("https://example.com/api/v1/")).toBe("https://example.com/api/v1");
    expect(removeTrailingSlash("https://example.com/path///")).toBe("https://example.com/path");
  });

  it("does not modify URLs that do not end in slash", () => {
    expect(removeTrailingSlash("https://example.com/api/v1")).toBe("https://example.com/api/v1");
    expect(removeTrailingSlash("https://example.com")).toBe("https://example.com");
  });

  it("does not corrupt bare protocol markers", () => {
    expect(removeTrailingSlash("https://")).toBe("https://");
  });

  it("handles empty input safely", () => {
    expect(removeTrailingSlash("")).toBe("");
  });
});

describe("validateUrl - Diagnostics & Breakdown", () => {
  it("returns isValid: true, normalizedUrl, and extracted domain for valid URLs", () => {
    const result = validateUrl("www.example.com/test");
    expect(result.isValid).toBe(true);
    expect(result.normalizedUrl).toBe("https://www.example.com/test");
    expect(result.domain).toBe("example.com");
    expect(result.error).toBeUndefined();
  });

  it("returns isValid: false and descriptive error for invalid inputs", () => {
    const emptyResult = validateUrl("");
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.error).toBe("URL cannot be empty");

    const badSchemeResult = validateUrl("javascript:alert(1)");
    expect(badSchemeResult.isValid).toBe(false);
    expect(badSchemeResult.error).toBeDefined();
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

describe("getUrlHostname – hostname extraction (preserving subdomains)", () => {
  it("extracts hostname from a full https URL", () => {
    expect(getUrlHostname("https://example.com/path")).toBe("example.com");
  });

  it("preserves www prefix (unlike extractDomain)", () => {
    expect(getUrlHostname("https://www.example.com")).toBe("www.example.com");
  });

  it("preserves non-www subdomains", () => {
    expect(getUrlHostname("https://docs.example.com/guide")).toBe("docs.example.com");
  });

  it("normalizes bare domain before extracting", () => {
    expect(getUrlHostname("example.com")).toBe("example.com");
  });

  it("returns empty string for invalid input", () => {
    expect(getUrlHostname("javascript:alert(1)")).toBe("");
    expect(getUrlHostname("")).toBe("");
    expect(getUrlHostname("not a url")).toBe("");
  });

  it("differs from extractDomain on www URLs", () => {
    const url = "https://www.example.com";
    expect(extractDomain(url)).toBe("example.com");
    expect(getUrlHostname(url)).toBe("www.example.com");
  });
});

