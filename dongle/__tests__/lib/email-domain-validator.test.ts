import { describe, it, expect, beforeEach } from "vitest";
import {
  validateEmailDomain,
  extractDomainFromEmail,
  isValidDomainFormat,
  clearMxCache,
  getMxCacheStats,
  type MxRecord,
} from "@/lib/email-domain-validator";

describe("Email Domain Validator (Issue #504)", () => {
  beforeEach(() => {
    clearMxCache();
  });

  describe("extractDomainFromEmail", () => {
    it("extracts domain from full email address", () => {
      expect(extractDomainFromEmail("user@example.com")).toBe("example.com");
      expect(extractDomainFromEmail("john.doe+tag@sub.domain.org")).toBe("sub.domain.org");
    });

    it("normalizes domain casing and whitespace", () => {
      expect(extractDomainFromEmail("  User@Example.COM  ")).toBe("example.com");
    });

    it("handles domain strings without at symbol", () => {
      expect(extractDomainFromEmail("example.com")).toBe("example.com");
      expect(extractDomainFromEmail("   domain.org   ")).toBe("domain.org");
    });

    it("returns empty string on invalid inputs", () => {
      expect(extractDomainFromEmail("")).toBe("");
      expect(extractDomainFromEmail(null as any)).toBe("");
      expect(extractDomainFromEmail(undefined as any)).toBe("");
    });
  });

  describe("isValidDomainFormat", () => {
    it("accepts valid domain names", () => {
      expect(isValidDomainFormat("google.com")).toBe(true);
      expect(isValidDomainFormat("stellar.org")).toBe(true);
      expect(isValidDomainFormat("mail.example.co.uk")).toBe(true);
      expect(isValidDomainFormat("my-domain.io")).toBe(true);
    });

    it("rejects invalid domain names", () => {
      expect(isValidDomainFormat("")).toBe(false);
      expect(isValidDomainFormat("localhost")).toBe(false);
      expect(isValidDomainFormat(".example.com")).toBe(false);
      expect(isValidDomainFormat("example.com.")).toBe(false);
      expect(isValidDomainFormat("exam_ple.com")).toBe(false);
      expect(isValidDomainFormat("-example.com")).toBe(false);
      expect(isValidDomainFormat("example..com")).toBe(false);
      expect(isValidDomainFormat("example.123")).toBe(false);
    });
  });

  describe("validateEmailDomain with mock DNS resolver", () => {
    const mockMxDb: Record<string, MxRecord[]> = {
      "gmail.com": [
        { exchange: "gmail-smtp-in.l.google.com", priority: 5 },
        { exchange: "alt1.gmail-smtp-in.l.google.com", priority: 10 },
      ],
      "stellar.org": [
        { exchange: "aspmx.l.google.com", priority: 1 },
      ],
      "outlook.com": [
        { exchange: "outlook-com.olc.protection.outlook.com", priority: 10 },
      ],
      "no-mx-records.com": [],
    };

    const mockResolver = async (domain: string): Promise<MxRecord[]> => {
      if (domain === "error-network.com") {
        throw new Error("DNS resolution failed: ESERVFAIL");
      }
      return mockMxDb[domain] || [];
    };

    it("validates domains with existing MX records", async () => {
      const result = await validateEmailDomain("alice@gmail.com", {
        resolver: mockResolver,
      });

      expect(result.valid).toBe(true);
      expect(result.domain).toBe("gmail.com");
      expect(result.mxRecords.length).toBe(2);
      expect(result.cached).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it("validates domains tested across multiple domains", async () => {
      const stellarResult = await validateEmailDomain("test@stellar.org", {
        resolver: mockResolver,
      });
      expect(stellarResult.valid).toBe(true);
      expect(stellarResult.domain).toBe("stellar.org");

      const outlookResult = await validateEmailDomain("user@outlook.com", {
        resolver: mockResolver,
      });
      expect(outlookResult.valid).toBe(true);
      expect(outlookResult.domain).toBe("outlook.com");
    });

    it("rejects domains without MX records", async () => {
      const result = await validateEmailDomain("user@no-mx-records.com", {
        resolver: mockResolver,
      });

      expect(result.valid).toBe(false);
      expect(result.domain).toBe("no-mx-records.com");
      expect(result.mxRecords).toEqual([]);
      expect(result.error).toContain("No active MX records found");
    });

    it("rejects malformed email domain inputs gracefully", async () => {
      const result = await validateEmailDomain("invalid-email-string", {
        resolver: mockResolver,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid email domain format");
    });

    it("caches lookup results and serves from cache on subsequent calls", async () => {
      const initial = await validateEmailDomain("user@gmail.com", {
        resolver: mockResolver,
      });
      expect(initial.cached).toBe(false);

      const cached = await validateEmailDomain("admin@gmail.com", {
        resolver: mockResolver,
      });
      expect(cached.cached).toBe(true);
      expect(cached.valid).toBe(true);
      expect(cached.mxRecords).toEqual(initial.mxRecords);

      const stats = getMxCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
    });

    it("supports bypassing the cache with bypassCache option", async () => {
      await validateEmailDomain("user@gmail.com", { resolver: mockResolver });
      const fresh = await validateEmailDomain("user@gmail.com", {
        resolver: mockResolver,
        bypassCache: true,
      });

      expect(fresh.cached).toBe(false);
      const stats = getMxCacheStats();
      expect(stats.misses).toBe(2);
    });

    it("handles DNS failures gracefully without throwing errors", async () => {
      const result = await validateEmailDomain("user@error-network.com", {
        resolver: mockResolver,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("DNS lookup failed");
    });
  });
});
