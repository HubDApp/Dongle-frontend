import { describe, it, expect } from "vitest";
import { validateRepositoryUrl, normalizeRepositoryUrl, parseRepositoryUrl } from "@/lib/repository";

describe("validateRepositoryUrl", () => {
  it("accepts a valid GitHub URL", () => {
    const result = validateRepositoryUrl("https://github.com/owner/repo");
    expect(result.isValid).toBe(true);
    expect(result.metadata).toEqual({ host: "github", owner: "owner", repo: "repo" });
  });

  it("accepts GitLab and Bitbucket URLs", () => {
    expect(validateRepositoryUrl("https://gitlab.com/group/project").isValid).toBe(true);
    expect(validateRepositoryUrl("https://bitbucket.org/team/repo").isValid).toBe(true);
  });

  it("accepts www hosts and URLs without a protocol", () => {
    const www = validateRepositoryUrl("https://www.github.com/owner/repo");
    expect(www.isValid).toBe(true);
    expect(www.metadata).toEqual({ host: "github", owner: "owner", repo: "repo" });
    expect(validateRepositoryUrl("github.com/owner/repo").isValid).toBe(true);
  });

  it("rejects unsupported hosts with a clear error", () => {
    const result = validateRepositoryUrl("https://example.com/owner/repo");
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/unsupported repository host/i);
  });

  it("rejects a URL missing the repository name", () => {
    const result = validateRepositoryUrl("https://github.com/owner");
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/owner\/repo/i);
  });

  it("rejects javascript: protocol", () => {
    expect(validateRepositoryUrl("javascript:alert(1)").isValid).toBe(false);
  });

  it("treats an empty string as valid because the field is optional", () => {
    expect(validateRepositoryUrl("").isValid).toBe(true);
  });

  it("strips a trailing .git suffix", () => {
    expect(validateRepositoryUrl("https://github.com/owner/repo.git").metadata?.repo).toBe("repo");
  });
});

describe("normalizeRepositoryUrl", () => {
  it("normalizes to a canonical https URL", () => {
    expect(normalizeRepositoryUrl("github.com/owner/repo")).toBe("https://github.com/owner/repo");
    expect(normalizeRepositoryUrl("https://www.github.com/owner/repo.git")).toBe(
      "https://github.com/owner/repo",
    );
  });
});

describe("parseRepositoryUrl", () => {
  it("extracts host, owner, and repo", () => {
    expect(parseRepositoryUrl("https://github.com/stellar/lend")).toEqual({
      host: "github",
      owner: "stellar",
      repo: "lend",
    });
  });
});
