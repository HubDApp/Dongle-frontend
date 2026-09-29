import { beforeEach, describe, expect, it } from "vitest";
import {
  clearProjectDomainValidationCache,
  validateProjectDomain,
} from "@/lib/project-domain-validation";

describe("validateProjectDomain", () => {
  beforeEach(() => {
    clearProjectDomainValidationCache();
  });

  it("requires a valid URL or domain", async () => {
    await expect(validateProjectDomain("javascript:alert(1)")).resolves.toMatchObject({
      valid: false,
      error: "Invalid domain or URL.",
    });
  });

  it("checks DNS resolution and HTTPS certificate status", async () => {
    const result = await validateProjectDomain("example.com", {
      resolver: async () => true,
      sslChecker: async () => true,
    });

    expect(result.valid).toBe(true);
    expect(result.info).toMatchObject({
      domain: "example.com",
      protocol: "https:",
      resolves: true,
      sslValid: true,
      cached: false,
    });
  });

  it("caches successful checks", async () => {
    let resolverCalls = 0;
    const options = {
      resolver: async () => {
        resolverCalls += 1;
        return true;
      },
      sslChecker: async () => true,
    };

    await validateProjectDomain("https://example.com", options);
    const cached = await validateProjectDomain("example.com", options);

    expect(resolverCalls).toBe(1);
    expect(cached.info?.cached).toBe(true);
  });

  it("reports unresolved domains", async () => {
    const result = await validateProjectDomain("missing.example", {
      resolver: async () => false,
      sslChecker: async () => true,
    });

    expect(result).toMatchObject({
      valid: false,
      error: "Domain does not resolve.",
    });
  });
});
