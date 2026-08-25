import { describe, it, expect } from "vitest";
import {
  isValidStellarAddress,
  validateStellarAddress,
  abbreviateStellarAddress,
  isValidSorobanContractId,
  validateSorobanContractId,
} from "@/lib/stellar-address";

describe("stellar-address", () => {
  // 56 chars: G + 55 chars from [A-Z0-9]
  const validAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRS";

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
      const result = validateStellarAddress("HABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRS");
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
      expect(result).toBe("GABC…PQRS");
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

// ─── Soroban contract ID ──────────────────────────────────────────────────────

describe("isValidSorobanContractId", () => {
  // 56 chars: C + 55 A's — valid base-32, valid prefix
  const validId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  it("should accept a valid 56-character contract ID starting with C", () => {
    expect(isValidSorobanContractId(validId)).toBe(true);
  });

  it("should accept all valid base-32 characters (A-Z and 2-7)", () => {
    // C + 32 base-32 chars + 23 more = 56 total
    const mixedId = "C" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567" + "ABCDEFGHIJKLMNOPQRSTUVW";
    expect(mixedId.length).toBe(56);
    expect(isValidSorobanContractId(mixedId)).toBe(true);
  });

  it("should reject empty string", () => {
    expect(isValidSorobanContractId("")).toBe(false);
  });

  it("should reject null/undefined", () => {
    expect(isValidSorobanContractId(null as unknown as string)).toBe(false);
    expect(isValidSorobanContractId(undefined as unknown as string)).toBe(false);
  });

  it("should reject an ID that does not start with C", () => {
    const wrongPrefix = "G" + "A".repeat(55);
    expect(isValidSorobanContractId(wrongPrefix)).toBe(false);
  });

  it("should reject an ID that is too short", () => {
    expect(isValidSorobanContractId("CAAAAAA")).toBe(false);
  });

  it("should reject an ID that is too long", () => {
    expect(isValidSorobanContractId(validId + "A")).toBe(false);
  });

  it("should reject an ID with invalid characters (0, 1, 8, 9)", () => {
    // '0' is not in base-32 (A-Z, 2-7)
    const withZero = "C" + "0".repeat(55);
    expect(isValidSorobanContractId(withZero)).toBe(false);
  });

  it("should be case-insensitive (normalises to uppercase internally)", () => {
    expect(isValidSorobanContractId(validId.toLowerCase())).toBe(true);
  });
});

describe("validateSorobanContractId", () => {
  const validId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  it("should return valid for a correct contract ID", () => {
    const result = validateSorobanContractId(validId);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.normalized).toBe(validId.toUpperCase());
    }
  });

  it("should normalise to uppercase", () => {
    const result = validateSorobanContractId(validId.toLowerCase());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.normalized).toBe(validId.toUpperCase());
    }
  });

  it("should return error for empty input", () => {
    const result = validateSorobanContractId("");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("required");
    }
  });

  it("should return error for wrong prefix", () => {
    const result = validateSorobanContractId("G" + "A".repeat(55));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("'C'");
    }
  });

  it("should return error for wrong length", () => {
    const result = validateSorobanContractId("CSHORT");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("56 characters");
    }
  });

  it("should return error for invalid characters", () => {
    // '0' is not valid in base-32 (A-Z, 2-7)
    const result = validateSorobanContractId("C" + "0".repeat(55));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("invalid characters");
    }
  });

  it("should trim surrounding whitespace before validating", () => {
    const result = validateSorobanContractId("  " + validId + "  ");
    expect(result.valid).toBe(true);
  });
});
