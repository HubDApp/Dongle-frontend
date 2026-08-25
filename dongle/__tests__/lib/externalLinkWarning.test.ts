import { describe, it, expect } from "vitest";
import {
  getApprovedProjectUrls,
  getExternalLinkWarningOptions,
  isApprovedExternalDestination,
  shouldBypassLinkWarning,
} from "@/lib/externalLinkWarning";

describe("shouldBypassLinkWarning", () => {
  it("bypasses only VERIFIED projects", () => {
    expect(shouldBypassLinkWarning("VERIFIED")).toBe(true);
    expect(shouldBypassLinkWarning("NONE")).toBe(false);
    expect(shouldBypassLinkWarning("PENDING")).toBe(false);
    expect(shouldBypassLinkWarning("REJECTED")).toBe(false);
    expect(shouldBypassLinkWarning(null)).toBe(false);
  });

  it("bypasses verified project domains that match registered URLs", () => {
    const approved = ["https://secure-test.xyz", "https://github.com/secure-test/repo"];
    expect(
      shouldBypassLinkWarning("VERIFIED", "https://secure-test.xyz/docs", approved),
    ).toBe(true);
    expect(
      shouldBypassLinkWarning("VERIFIED", "https://github.com/secure-test/repo", approved),
    ).toBe(true);
  });

  it("does not bypass unknown domains even when the project is verified", () => {
    const approved = ["https://secure-test.xyz", "https://github.com/secure-test/repo"];
    expect(
      shouldBypassLinkWarning("VERIFIED", "https://phishing.example/connect", approved),
    ).toBe(false);
    expect(
      shouldBypassLinkWarning("VERIFIED", "https://github.com/other/malware", approved),
    ).toBe(false);
  });
});

describe("isApprovedExternalDestination", () => {
  it("matches website hosts and the registered repository only", () => {
    const approved = ["https://app.example.com", "https://github.com/org/app"];
    expect(isApprovedExternalDestination("https://app.example.com/path", approved)).toBe(true);
    expect(isApprovedExternalDestination("https://github.com/org/app/issues", approved)).toBe(true);
    expect(isApprovedExternalDestination("https://github.com/org/other", approved)).toBe(false);
    expect(isApprovedExternalDestination("https://evil.example", approved)).toBe(false);
  });
});

describe("getApprovedProjectUrls", () => {
  it("returns registered website and repository URLs", () => {
    expect(
      getApprovedProjectUrls({
        websiteUrl: "https://example.com",
        githubUrl: "https://github.com/org/repo",
      }),
    ).toEqual(["https://example.com", "https://github.com/org/repo"]);
  });
});

describe("getExternalLinkWarningOptions", () => {
  it("includes the full destination domain and URL", () => {
    const options = getExternalLinkWarningOptions(
      "evil.example",
      "https://evil.example/login",
      "NONE",
    );
    expect(options.destinationDomain).toBe("evil.example");
    expect(options.destinationUrl).toBe("https://evil.example/login");
    expect(options.description).toContain("evil.example");
    expect(options.description).toContain("https://evil.example/login");
  });

  it("uses stronger copy for rejected projects", () => {
    const options = getExternalLinkWarningOptions(
      "bad.example",
      "https://bad.example",
      "REJECTED",
    );
    expect(options.title).toMatch(/Rejected/i);
    expect(options.destinationUrl).toBe("https://bad.example");
  });
});
