import { describe, it, expect } from "vitest";
import {
  isValidStellarAddress,
  validateStellarAddress,
  abbreviateStellarAddress,
} from "@/lib/stellar-address";

describe("stellar-address", () => {
  const validAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRST";

  describe("isValidStellarAddress", () => {
    it("should accept a valid 56-character Stellar address starting with G", () => {
      expect(isValidStellarAddress(validAddress)).toBe(true);
    });

    it("should accept lowercase and uppercase", () => {
      expect(isValidStellarAddress(validAddress.toLowerCase())).toBe(true);
    });

    it("should reject empty string", () => {
      expect(isValidStellarAddress("")).toBe(false);
    });

    it("should reject null/undefined", () => {
      expect(isValidStellarAddress(null as unknown as string)).toBe(false);
      expect(isValidStellarAddress(undefined as unknown as string)).toBe(false);
    });

    it("should reject address that doesn't start with G", () => {
      expect(isValidStellarAddress("HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRST")).toBe(false);
    });

    it("should reject address with invalid characters", () => {
      expect(isValidStellarAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRST!")).toBe(false);
    });

    it("should reject address that is too short", () => {
      expect(isValidStellarAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ")).toBe(false);
    });

    it("should reject address that is too long", () => {
      expect(isValidStellarAddress(validAddress + "A")).toBe(false);
    });
  });

  describe("validateStellarAddress", () => {
    it("should return valid for a correct address", () => {
      const result = validateStellarAddress(validAddress);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.normalized).toBe(validAddress.toUpperCase());
      }
    });

    it("should return error for empty address", () => {
      const result = validateStellarAddress("");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("required");
      }
    });

    it("should return error for address not starting with G", () => {
      const result = validateStellarAddress("HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRST");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("start with 'G'");
      }
    });

    it("should return error for wrong length", () => {
      const result = validateStellarAddress("GSHORT");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("56 characters");
      }
    });

    it("should normalize to uppercase", () => {
      const lower = validAddress.toLowerCase();
      const result = validateStellarAddress(lower);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.normalized).toBe(validAddress.toUpperCase());
      }
    });
  });

  describe("abbreviateStellarAddress", () => {
    it("should show first 4 and last 4 characters", () => {
      const result = abbreviateStellarAddress(validAddress);
      expect(result).toBe("GBCD…QRST");
    });

    it("should handle short strings gracefully", () => {
      expect(abbreviateStellarAddress("G")).toBe("G");
    });

    it("should handle empty string", () => {
      expect(abbreviateStellarAddress("")).toBe("");
    });

    it("should handle null/undefined", () => {
      expect(abbreviateStellarAddress(null as unknown as string)).toBe("");
      expect(abbreviateStellarAddress(undefined as unknown as string)).toBe("");
    });
  });
});
