import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Freighter's signMessage before importing the service
vi.mock("@stellar/freighter-api", () => ({
  signMessage: vi.fn(),
}));

vi.mock("@/lib/id-generator", () => ({
  generateId: vi.fn().mockReturnValue("test-nonce-001"),
}));

import { signMessage } from "@stellar/freighter-api";
import { submissionSigningService } from "@/services/submission-signing/submission-signing.service";

describe("submissionSigningService", () => {
  const mockPublicKey = "GCXJZ4FZK6B2Q3K7J6Q5TJGZ5L7X4P5Q6R7S8T9U0V1W2X3Y4Z5A6B7C8D9E";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("deterministicStringify", () => {
    it("should produce deterministic JSON with sorted keys", () => {
      const input = { z: 1, a: 2, m: 3, c: { n: 4, b: 5 } };
      const result = submissionSigningService.deterministicStringify(input);
      expect(result).toBe('{"a":2,"c":{"n":4,"b":5},"m":3,"z":1}');
    });

    it("should produce the same output regardless of key insertion order", () => {
      const a = { b: 1, a: 2 };
      const b = { a: 2, b: 1 };
      expect(submissionSigningService.deterministicStringify(a)).toBe(
        submissionSigningService.deterministicStringify(b),
      );
    });
  });

  describe("signPayload", () => {
    it("should sign a payload and return signature metadata", async () => {
      const mockSignature = "dGhpcyBpcyBhIG1vY2sgc2lnbmF0dXJl"; // "this is a mock signature" base64
      vi.mocked(signMessage).mockResolvedValue({ signature: mockSignature } as never);

      const result = await submissionSigningService.signPayload(
        { rating: 5, comment: "Great dApp!" },
        mockPublicKey,
      );

      expect(result).toBeDefined();
      expect(result.signature).toBe(mockSignature);
      expect(result.publicKey).toBe(mockPublicKey);
      expect(result.nonce).toBe("test-nonce-001");
      expect(result.timestamp).toBeDefined();
      expect(result.payload).toContain("rating");
      expect(result.payload).toContain("comment");
      expect(result.payload).toContain("nonce");
      expect(result.payload).toContain("timestamp");
      expect(result.payload).toContain("publicKey");

      // Verify that signMessage was called with a deterministic payload string
      expect(signMessage).toHaveBeenCalledTimes(1);
      const calledArg = (signMessage as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(typeof calledArg).toBe("string");

      // The payload should contain sorted keys
      const parsed = JSON.parse(calledArg);
      const keys = Object.keys(parsed);
      expect(keys).toEqual([...keys].sort());
    });

    it("should throw when Freighter signMessage fails", async () => {
      vi.mocked(signMessage).mockRejectedValue(new Error("User rejected signing") as never);

      await expect(
        submissionSigningService.signPayload({ test: true }, mockPublicKey),
      ).rejects.toThrow("User rejected signing");
    });
  });

  describe("sign", () => {
    it("should wrap signed payload together with original data and submissionId", async () => {
      vi.mocked(signMessage).mockResolvedValue({ signature: "bW9ja3NpZw==" } as never);

      const formData = { rating: 4, comment: "Pretty good" };
      const result = await submissionSigningService.sign(formData, mockPublicKey);

      expect(result.data).toEqual(formData);
      expect(result.submissionId).toBe("test-nonce-001");
      expect(result.signedPayload).toBeDefined();
      expect(result.signedPayload.payload).toContain("rating");
      expect(result.signedPayload.payload).toContain("comment");
      expect(result.signedPayload.publicKey).toBe(mockPublicKey);
    });
  });
});