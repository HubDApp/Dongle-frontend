import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock next/headers before importing admin-auth
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => undefined),
      set: vi.fn(),
      delete: vi.fn(),
    }),
  ),
}));

// We need to test the JWT functions directly. Import after mocking.
// Since admin-auth.ts uses env vars at module load, we set them before import.
process.env.ADMIN_JWT_SECRET = "test-secret-key-for-unit-tests";
process.env.ADMIN_ALLOWLIST = "GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678,GDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678";

// Dynamic import after env setup
const { createAdminToken, verifyAdminToken, refreshAdminToken, isAdminAllowed } = await import("@/lib/admin-auth");

const TEST_PUBLIC_KEY = "GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678";
const NON_ADMIN_KEY = "GXYZ9999999999ABCDEF1234567890ABCDEF1234567890ABCDEF12345678";

describe("admin-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isAdminAllowed", () => {
    it("returns true for keys in the allowlist", () => {
      expect(isAdminAllowed(TEST_PUBLIC_KEY)).toBe(true);
    });

    it("returns false for keys not in the allowlist", () => {
      expect(isAdminAllowed(NON_ADMIN_KEY)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isAdminAllowed("")).toBe(false);
    });
  });

  describe("createAdminToken", () => {
    it("creates a valid JWT with the public key", async () => {
      const token = await createAdminToken(TEST_PUBLIC_KEY);
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // header.payload.signature

      const payload = await verifyAdminToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.publicKey).toBe(TEST_PUBLIC_KEY);
    });

    it("includes a unique nonce", async () => {
      const token1 = await createAdminToken(TEST_PUBLIC_KEY);
      const token2 = await createAdminToken(TEST_PUBLIC_KEY);

      const p1 = await verifyAdminToken(token1);
      const p2 = await verifyAdminToken(token2);
      expect(p1!.nonce).not.toBe(p2!.nonce);
    });
  });

  describe("verifyAdminToken", () => {
    it("returns the payload for a valid token", async () => {
      const token = await createAdminToken(TEST_PUBLIC_KEY);
      const payload = await verifyAdminToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.publicKey).toBe(TEST_PUBLIC_KEY);
    });

    it("returns null for an invalid token", async () => {
      const payload = await verifyAdminToken("invalid.token.here");
      expect(payload).toBeNull();
    });

    it("returns null for a token with wrong secret", async () => {
      // Create a token with a different secret using crypto.subtle
      const { SignJWT } = await import("jose");
      const wrongKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode("wrong-secret"),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      );
      const token = await new SignJWT({ publicKey: TEST_PUBLIC_KEY, nonce: "test" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("15m")
        .setJti("test")
        .sign(wrongKey);

      const payload = await verifyAdminToken(token);
      expect(payload).toBeNull();
    });
  });

  describe("refreshAdminToken", () => {
    it("issues a new token with a different nonce", async () => {
      const originalToken = await createAdminToken(TEST_PUBLIC_KEY);
      const newToken = await refreshAdminToken(originalToken);

      expect(newToken).not.toBeNull();
      expect(newToken).not.toBe(originalToken);

      const newPayload = await verifyAdminToken(newToken!);
      expect(newPayload!.publicKey).toBe(TEST_PUBLIC_KEY);
    });

    it("returns null for an invalid token", async () => {
      const result = await refreshAdminToken("invalid.token");
      expect(result).toBeNull();
    });
  });
});
