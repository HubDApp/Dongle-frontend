import { describe, it, expect } from "vitest";
import {
  validateRepositoryUrl,
  normalizeRepositoryUrl,
  parseRepositoryUrl,
} from "@/lib/repository";
import { repositoryUrlSchema } from "@/components/projects/ProjectForm";

describe("validateRepositoryUrl - supported hosts", () => {
  it.each([
    ["https://github.com/owner/repo", "github"],
    ["https://gitlab.com/group/project", "gitlab"],
    ["https://bitbucket.org/team/repo", "bitbucket"],
    ["http://github.com/owner/repo", "github"],
    ["https://www.gitlab.com/group/project", "gitlab"],
    ["github.com/owner/repo", "github"],
    ["https://GitHub.com/owner/repo", "github"],
  ])("accepts %s", (url, host) => {
    const result = validateRepositoryUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.metadata?.host).toBe(host);
  });
});

describe("validateRepositoryUrl - edge cases", () => {
  it.each([
    ["trailing slash", "https://github.com/owner/repo/"],
    ["query params", "https://github.com/owner/repo?tab=readme"],
    ["anchor", "https://github.com/owner/repo#readme"],
    ["deep path", "https://github.com/owner/repo/tree/main/src"],
    [".git suffix", "https://github.com/owner/repo.git"],
    ["surrounding whitespace", "  https://github.com/owner/repo  "],
  ])("accepts %s and keeps owner/repo", (_label, url) => {
    expect(parseRepositoryUrl(url)).toEqual({ host: "github", owner: "owner", repo: "repo" });
  });

  it.each([
    ["trailing slash", "https://gitlab.com/group/project/"],
    ["query params", "https://bitbucket.org/team/repo?at=main"],
    ["anchor", "https://github.com/owner/repo#readme"],
  ])("normalizes %s to the canonical URL", (_label, url) => {
    expect(normalizeRepositoryUrl(url)).toMatch(/^https:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/[\w.-]+\/[\w.-]+$/);
  });

  it("returns the input unchanged when it cannot be normalized", () => {
    expect(normalizeRepositoryUrl("not a url")).toBe("not a url");
  });

  it("returns undefined metadata for invalid URLs", () => {
    expect(parseRepositoryUrl("https://example.com/a/b")).toBeUndefined();
  });

  it("treats empty and whitespace-only input as valid (optional field)", () => {
    expect(validateRepositoryUrl("")).toEqual({ isValid: true });
    expect(validateRepositoryUrl("   ")).toEqual({ isValid: true });
  });
});

describe("validateRepositoryUrl - invalid URLs and error messages", () => {
  it.each([
    ["unsupported host (Gitea)", "https://gitea.com/owner/repo", /Unsupported repository host/],
    ["self-hosted Gitea", "https://git.example.org/owner/repo", /Unsupported repository host/],
    ["localhost", "http://localhost/owner/repo", /Unsupported repository host/],
    ["localhost with port", "http://localhost:3000/owner/repo", /Unsupported repository host/],
    ["loopback IP", "http://127.0.0.1/owner/repo", /Unsupported repository host/],
    ["missing repo", "https://github.com/owner", /Expected: https:\/\/github.com\/owner\/repo/],
    ["host only", "https://github.com", /Expected/],
    ["invalid characters", "https://github.com/own er/re$po", /invalid characters/],
    ["ftp protocol", "ftp://github.com/owner/repo", /Unsupported repository host|http or https|Invalid URL format/],
    ["javascript protocol", "javascript:alert(1)", /./],
    ["garbage", "http://", /Invalid URL format/],
  ])("rejects %s", (_label, url, message) => {
    const result = validateRepositoryUrl(url);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(message);
    expect(result.metadata).toBeUndefined();
  });
});

describe("repositoryUrlSchema (Zod)", () => {
  it("normalizes a valid URL", () => {
    expect(repositoryUrlSchema.parse("github.com/owner/repo.git/")).toBe("https://github.com/owner/repo");
  });

  it("passes blank input through as an empty string", () => {
    expect(repositoryUrlSchema.parse("")).toBe("");
  });

  it.each([
    ["https://gitea.com/owner/repo", /Unsupported repository host/],
    ["https://github.com/owner", /Expected/],
  ])("surfaces the validation error for %s", (url, message) => {
    const result = repositoryUrlSchema.safeParse(url);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(message);
  });
});
