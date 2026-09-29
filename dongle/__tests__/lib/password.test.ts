/**
 * Tests for password hashing and verification utilities.
 *
 * Covers:
 *   1. Password hashing produces consistent output shape
 *   2. Password verification succeeds for matching passwords
 *   3. Password verification fails for non-matching passwords
 *   4. Password verification with wrong salt yields false
 *   5. Serialization and deserialization round-trip
 *   6. Deserialization rejects malformed strings
 *   7. Password strength scoring for various inputs
 *   8. Strength label mapping
 *   9. Edge cases: empty string, special characters
 */

import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  serializeHash,
  deserializeHash,
  passwordStrength,
  strengthLabel,
} from "@/lib/password";

describe("password utility", () => {
  describe("hashPassword and verifyPassword", () => {
    it("produces a hash with salt, hash, and iterations", async () => {
      const result = await hashPassword("my-secure-p@ssword", 1000);

      expect(result).toHaveProperty("salt");
      expect(result).toHaveProperty("hash");
      expect(result).toHaveProperty("iterations");
      expect(result.salt).toBeTruthy();
      expect(result.hash).toBeTruthy();
      expect(result.iterations).toBe(1000);
    });

    it("verifies a matching password", async () => {
      const password = "corr3ct-h0rse-b@ttery-staple";
      const hashed = await hashPassword(password, 1000);
      const valid = await verifyPassword(password, hashed);
      expect(valid).toBe(true);
    });

    it("rejects an incorrect password", async () => {
      const hashed = await hashPassword("real-password", 1000);
      const valid = await verifyPassword("wrong-password", hashed);
      expect(valid).toBe(false);
    });

    it("rejects a password with a different salt (simulated)", async () => {
      const hashed = await hashPassword("password", 1000);
      const tampered = { ...hashed, salt: hashed.salt.replace(/A/g, "B") };
      const valid = await verifyPassword("password", tampered);
      expect(valid).toBe(false);
    });

    it("uses default iterations when not specified", async () => {
      const result = await hashPassword("test-password");
      expect(result.iterations).toBe(600_000);
    });

    it("handles passwords with special characters", async () => {
      const password = "p@ss!*#$%&()[]{}|;:',.<>?/~`";
      const hashed = await hashPassword(password, 100);
      const valid = await verifyPassword(password, hashed);
      expect(valid).toBe(true);
    });

    it("handles empty string password", async () => {
      const hashed = await hashPassword("", 100);
      const valid = await verifyPassword("", hashed);
      expect(valid).toBe(true);
      const wrong = await verifyPassword("a", hashed);
      expect(wrong).toBe(false);
    });

    it("returns false for corrupted hash data", async () => {
      const result = await verifyPassword("anything", {
        salt: "!!!invalid-base64!!!",
        hash: "!!!invalid-base64!!!",
        iterations: 100,
      });
      expect(result).toBe(false);
    });
  });

  describe("serializeHash / deserializeHash", () => {
    it("round-trips a hash object", async () => {
      const original = await hashPassword("test-password", 5000);
      const serialized = serializeHash(original);
      const deserialized = deserializeHash(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.salt).toBe(original.salt);
      expect(deserialized!.hash).toBe(original.hash);
      expect(deserialized!.iterations).toBe(original.iterations);
    });

    it("returns null for malformed serialized strings", () => {
      expect(deserializeHash("")).toBeNull();
      expect(deserializeHash("not-a-valid-format")).toBeNull();
      expect(deserializeHash("pbkdf2_sha256abc$salt$hash")).toBeNull();
      expect(deserializeHash("pbkdf2_sha2560$salt$hash")).toBeNull();
      expect(deserializeHash("pbkdf2_sha256-100$salt$hash")).toBeNull();
    });

    it("serialized format can be verified against", async () => {
      const password = "verify-after-serialize";
      const original = await hashPassword(password, 500);
      const serialized = serializeHash(original);
      const deserialized = deserializeHash(serialized)!;

      const valid = await verifyPassword(password, deserialized);
      expect(valid).toBe(true);
    });
  });

  describe("passwordStrength", () => {
    it("scores 0 for an empty string", () => {
      expect(passwordStrength("")).toBe(0);
    });

    it("scores 0 for a very short string", () => {
      expect(passwordStrength("ab")).toBe(0);
    });

    it("scores 1 for length >= 8 only", () => {
      // 8 chars, lowercase only, no digits, no symbols
      expect(passwordStrength("abcdefgh")).toBe(1);
    });

    it("scores 2 for length >= 12 with lowercase only", () => {
      expect(passwordStrength("abcdefghijkl")).toBe(2);
    });

    it("scores 4 for a complex password meeting all criteria", () => {
      expect(passwordStrength("Str0ng!Pass")).toBe(4);
    });

    it("scores 3 for length 8+ with uppercase and digit", () => {
      // length >= 8 (1) + uppercase (1) + digit (1) = 3
      expect(passwordStrength("Abcdefg1")).toBe(3);
    });

    it("handles Unicode characters", () => {
      expect(passwordStrength("hélloWörld9!")).toBeGreaterThanOrEqual(3);
    });
  });

  describe("strengthLabel", () => {
    it("returns correct labels for each score", () => {
      expect(strengthLabel(0)).toBe("Very weak");
      expect(strengthLabel(1)).toBe("Weak");
      expect(strengthLabel(2)).toBe("Fair");
      expect(strengthLabel(3)).toBe("Strong");
      expect(strengthLabel(4)).toBe("Very strong");
    });

    it("returns 'Unknown' for out-of-range scores", () => {
      expect(strengthLabel(-1)).toBe("Unknown");
      expect(strengthLabel(5)).toBe("Unknown");
    });
  });
});