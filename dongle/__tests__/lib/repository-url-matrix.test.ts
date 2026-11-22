import { describe, it, expect } from "vitest";
import {
  validateRepositoryUrl,
  normalizeRepositoryUrl,
  parseRepositoryUrl,
} from "@/lib/repository";
import { repositoryUrlSchema } from "@/components/projects/ProjectForm";

describe("validateRepositoryUrl - valid URLs across supported hosts", () => {
  it.each([
    ["https://github.com/owner/repo", "github"],
    ["https://gitlab.com/group/project", "gitlab"],
    ["https://bitbucket.org/team/repo", "bitbucket"],
    ["https://gitea.com/owner/repo", "gitea"],
    ["http://github.com/owner/repo", "github"],
    ["http://gitea.com/owner/repo", "gitea"],
    ["https://www.gitlab.com/group/project", "gitlab"],
    ["www.bitbucket.org/team/repo", "bitbucket"],
    ["github.com/owner/repo", "github"],
    ["gitea.com/owner/repo", "gitea"],
    ["https://GitHub.com/owner/repo", "github"],
    ["https://GITEA.com/owner/repo", "gitea"],
    ["  https://gitea.com/owner/repo  ", "gitea"],
  ])("accepts %s (%s)", (url, host) => {
    const result = validateRepositoryUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.metadata?.host).toBe(host);
  });
});

describe("validateRepositoryUrl - accepted by supported host", () => {
  it.each([
    ["github", "https://github.com/owner/repo", "owner", "repo"],
    ["gitlab", "https://gitlab.com/group/project", "group", "project"],
    ["bitbucket", "https://bitbucket.org/team/repo", "team", "repo"],
    ["gitea", "https://gitea.com/owner/repo", "owner", "repo"],
  ])("parses the %s URL into owner/repo", (host, url, owner, repo) => {
    expect(validateRepositoryUrl(url)).toEqual({
      isValid: true,
      metadata: { host, owner, repo },
    });
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
    ["trailing slash", "https://gitlab.com/group/project/", "https://gitlab.com/group/project"],
    ["query params", "https://bitbucket.org/team/repo?at=main", "https://bitbucket.org/team/repo"],
    ["anchor", "https://github.com/owner/repo#readme", "https://github.com/owner/repo"],
    [".git suffix", "https://gitea.com/owner/repo.git", "https://gitea.com/owner/repo"],
    ["missing protocol", "gitea.com/owner/repo", "https://gitea.com/owner/repo"],
    ["www prefix", "https://www.github.com/owner/repo", "https://github.com/owner/repo"],
  ])("normalizes %s to the canonical URL", (_label, url, expected) => {
    expect(normalizeRepositoryUrl(url)).toBe(expected);
  });

  it("treats empty and whitespace-only input as valid (optional field)", () => {
    expect(validateRepositoryUrl("")).toEqual({ isValid: true });
    expect(validateRepositoryUrl("   ")).toEqual({ isValid: true });
  });
});

describe("validateRepositoryUrl - invalid URLs and error messages", () => {
  it.each([
    ["unsupported host", "https://sourceforge.net/owner/repo", /Unsupported repository host/],
    ["self-hosted Gitea instance", "https://git.example.org/owner/repo", /Unsupported repository host/],
    ["generic domain", "https://example.com/owner/repo", /Unsupported repository host/],
    ["localhost", "http://localhost/owner/repo", /Unsupported repository host/],
    ["localhost with port", "http://localhost:3000/owner/repo", /Unsupported repository host/],
    ["loopback IP", "http://127.0.0.1/owner/repo", /Unsupported repository host/],
    ["missing repo", "https://github.com/owner", /Expected: https:\/\/github.com\/owner\/repo/],
    ["host only", "https://github.com", /Expected/],
    ["host with trailing slash only", "https://gitea.com/", /Expected/],
    ["invalid characters in owner", "https://github.com/own er/repo", /invalid characters/],
    ["invalid characters in repo", "https://github.com/owner/re$po", /invalid characters/],
    ["ftp protocol", "ftp://github.com/owner/repo", /must use http or https/],
    ["javascript protocol", "javascript:alert(1)", /Invalid URL format/],
    ["malformed URL", "http://", /Invalid URL format/],
  ])("rejects %s", (_label, url, message) => {
    const result = validateRepositoryUrl(url);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(message);
    expect(result.metadata).toBeUndefined();
  });
});

describe("normalizeRepositoryUrl", () => {
  it.each([
    ["not a url"],
    ["https://sourceforge.net/owner/repo"],
    ["https://github.com/owner"],
  ])("returns %s unchanged when it cannot be normalized", (url) => {
    expect(normalizeRepositoryUrl(url)).toBe(url);
  });

  it("returns an empty string unchanged (valid but has no metadata)", () => {
    expect(normalizeRepositoryUrl("")).toBe("");
  });
});

describe("parseRepositoryUrl", () => {
  it("returns undefined metadata for invalid URLs", () => {
    expect(parseRepositoryUrl("https://example.com/a/b")).toBeUndefined();
  });

  it("extracts host, owner, and repo", () => {
    expect(parseRepositoryUrl("https://gitea.com/owner/repo")).toEqual({
      host: "gitea",
      owner: "owner",
      repo: "repo",
    });
  });
});

describe("repositoryUrlSchema (Zod)", () => {
  it.each([
    ["github.com/owner/repo.git/", "https://github.com/owner/repo"],
    ["https://gitea.com/owner/repo", "https://gitea.com/owner/repo"],
    ["https://www.gitlab.com/group/project/", "https://gitlab.com/group/project"],
    ["https://bitbucket.org/team/repo?at=main", "https://bitbucket.org/team/repo"],
  ])("normalizes a valid URL: %s", (input, expected) => {
    expect(repositoryUrlSchema.parse(input)).toBe(expected);
  });

  it("passes blank input through as an empty string", () => {
    expect(repositoryUrlSchema.parse("")).toBe("");
    expect(repositoryUrlSchema.parse("   ")).toBe("");
  });

  it.each([
    ["https://sourceforge.net/owner/repo", /Unsupported repository host/],
    ["https://github.com/owner", /Expected/],
    ["ftp://github.com/owner/repo", /must use http or https/],
    ["http://localhost/owner/repo", /Unsupported repository host/],
    ["https://github.com/owner/re$po", /invalid characters/],
  ])("surfaces the validation error for %s", (url, message) => {
    const result = repositoryUrlSchema.safeParse(url);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(message);
  });
});
