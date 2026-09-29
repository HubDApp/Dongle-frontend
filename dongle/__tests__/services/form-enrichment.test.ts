import { describe, it, expect } from "vitest";
import {
  geocodeAddress,
  reverseGeocode,
  lookupCompany,
  verifyEmail,
  validatePhone,
  checkDataAccuracy,
  enrichFormData,
} from "@/services/form-enrichment";

describe("Form Data Enrichment System", () => {
  describe("Geocoding for Addresses", () => {
    it("geocodes recognized global tech hubs into structured location data", async () => {
      const result = await geocodeAddress("San Francisco, CA");
      expect(result).not.toBeNull();
      expect(result?.city).toBe("San Francisco");
      expect(result?.countryCode).toBe("US");
      expect(result?.latitude).toBeCloseTo(37.77, 1);
      expect(result?.timezone).toBe("America/Los_Angeles");
      expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("geocodes international cities properly (e.g. London, Berlin, Lagos)", async () => {
      const london = await geocodeAddress("London, UK");
      expect(london?.countryCode).toBe("GB");
      expect(london?.timezone).toBe("Europe/London");

      const berlin = await geocodeAddress("Berlin, Germany");
      expect(berlin?.countryCode).toBe("DE");

      const lagos = await geocodeAddress("Lagos, Nigeria");
      expect(lagos?.countryCode).toBe("NG");
      expect(lagos?.timezone).toBe("Africa/Lagos");
    });

    it("handles fallback addresses gracefully", async () => {
      const result = await geocodeAddress("123 Blockchain Way, Remote Valley");
      expect(result).not.toBeNull();
      expect(result?.formattedAddress).toContain("Blockchain Way");
    });
  });

  describe("Company Data Lookup", () => {
    it("looks up curated Web3 and Stellar organizations", async () => {
      const stellar = await lookupCompany("https://stellar.org");
      expect(stellar).not.toBeNull();
      expect(stellar?.companyName).toBe("Stellar Development Foundation");
      expect(stellar?.verified).toBe(true);
      expect(stellar?.techStack).toContain("Soroban");

      const circle = await lookupCompany("circle.com");
      expect(circle?.companyName).toBe("Circle");
      expect(circle?.sector).toBe("Payments");
    });

    it("synthesizes company metadata from arbitrary domains", async () => {
      const custom = await lookupCompany("https://acme-protocol.io");
      expect(custom).not.toBeNull();
      expect(custom?.domain).toBe("acme-protocol.io");
      expect(custom?.companyName).toBe("Acme Protocol");
      expect(custom?.socialProfiles.github).toContain("github.com/acme-protocol");
    });
  });

  describe("Email Verification", () => {
    it("validates correct corporate emails with high score", () => {
      const result = verifyEmail("developer@stellar.org");
      expect(result.isValid).toBe(true);
      expect(result.status).toBe("valid");
      expect(result.isDisposable).toBe(false);
      expect(result.isRoleBased).toBe(false);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it("detects disposable burner email domains", () => {
      const result = verifyEmail("scammer@mailinator.com");
      expect(result.isDisposable).toBe(true);
      expect(result.status).toBe("invalid");
      expect(result.score).toBeLessThan(40);
      expect(result.flags).toEqual(
        expect.arrayContaining([expect.stringContaining("Disposable")]),
      );
    });

    it("identifies role-based accounts (e.g. admin@, support@)", () => {
      const result = verifyEmail("support@company.com");
      expect(result.isValid).toBe(true);
      expect(result.isRoleBased).toBe(true);
      expect(result.status).toBe("risky");
    });

    it("flags invalid email syntax", () => {
      const result = verifyEmail("not-an-email");
      expect(result.isValid).toBe(false);
      expect(result.status).toBe("invalid");
      expect(result.score).toBe(0);
    });
  });

  describe("Phone Number Validation", () => {
    it("standardizes US numbers to E.164 format", () => {
      const result = validatePhone("(415) 555-2671");
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe("+14155552671");
      expect(result.countryCode).toBe("US");
    });

    it("standardizes UK numbers to E.164 format", () => {
      const result = validatePhone("+44 7911 123456");
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe("+447911123456");
      expect(result.countryCode).toBe("GB");
      expect(result.numberType).toBe("mobile");
    });

    it("rejects numbers with invalid length", () => {
      const result = validatePhone("123");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Data Accuracy Checking", () => {
    it("computes high accuracy score when contact email matches website domain", () => {
      const emailResult = verifyEmail("contact@sorobanswap.io");
      const report = checkDataAccuracy({
        input: {
          domainOrWebsite: "https://sorobanswap.io",
          contractAddresses: ["CA3D5KRYMCMQU7YOGYSTKZSDPTZE7BM7TDTW3HMWODWH7SX7QL2NCXYZ"],
        },
        emailResult,
      });

      expect(report.overallScore).toBeGreaterThanOrEqual(80);
      expect(report.qualityTier).toBe("excellent");
      expect(report.checks.some((c) => c.name === "Domain Alignment" && c.passed)).toBe(true);
    });

    it("generates warning when email domain does not match website domain", () => {
      const emailResult = verifyEmail("alice@gmail.com");
      const report = checkDataAccuracy({
        input: {
          domainOrWebsite: "https://enterprise-defi.com",
        },
        emailResult,
      });

      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.suggestions).toEqual(
        expect.arrayContaining([expect.stringContaining("email address matching your project domain")]),
      );
    });
  });

  describe("Full Form Enrichment Pipeline", () => {
    it("runs complete enrichment pipeline asynchronously", async () => {
      const enriched = await enrichFormData({
        companyName: "Stellar Development Foundation",
        domainOrWebsite: "https://stellar.org",
        address: "San Francisco, CA",
        email: "partner@stellar.org",
        phone: "+1 415 555 0199",
      });

      expect(enriched.geocoding?.city).toBe("San Francisco");
      expect(enriched.company?.companyName).toContain("Stellar");
      expect(enriched.email?.isValid).toBe(true);
      expect(enriched.phone?.isValid).toBe(true);
      expect(enriched.accuracy.overallScore).toBeGreaterThan(80);
      expect(enriched.enrichedAt).toBeDefined();
    });
  });
});
