import { describe, it, expect, vi, beforeEach } from "vitest";
import { Keypair } from "stellar-sdk";

// We test verifySignature with a real Keypair so we can generate known
// valid signatures and confirm both acceptance and rejection.
vi.mock("crypto", () => {
  const actual = require("crypto");
  return {
    ...actual,
    createHash: actual.createHash,
  };
});

import { verifySignature } from "@/lib/verify-signature";

describe("verifySignature", () => {
  // Generate a real Stellar keypair for testing
  const keypair = Keypair.random();
  const publicKey = keypair.publicKey();

  function signPayload(payload: string): string {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(payload, "utf-8").digest();
    const sig = keypair.sign(hash);
    return Buffer.from(sig).toString("base64");
  }

  it("should return true for a valid signature", () => {
    const payload = '{"comment":"Great!","rating":5}';
    const signature = signPayload(payload);
    expect(verifySignature(payload, signature, publicKey)).toBe(true);
  });

  it("should return false when the payload has been tampered with", () => {
    const originalPayload = '{"comment":"Great!","rating":5}';
    const signature = signPayload(originalPayload);

    // Tampered payload
    const tamperedPayload = '{"comment":"Not great!","rating":1}';
    expect(verifySignature(tamperedPayload, signature, publicKey)).toBe(false);
  });

  it("should return false when the signature does not match", () => {
    const payload = '{"comment":"Great!","rating":5}';

    // Wrong key signs
    const wrongKeypair = Keypair.random();
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(payload, "utf-8").digest();
    const wrongSig = Buffer.from(wrongKeypair.sign(hash)).toString("base64");

    expect(verifySignature(payload, wrongSig, publicKey)).toBe(false);
  });

  it("should return false for an invalid public key format", () => {
    const payload = '{"comment":"Great!","rating":5}';
    expect(verifySignature(payload, "aW52YWxpZA==", "INVALID_PUBLIC_KEY")).toBe(false);
  });

  it("should return false for invalid base64 signature", () => {
    const payload = '{"comment":"Great!","rating":5}';
    expect(verifySignature(payload, "!!!not-base64!!!", publicKey)).toBe(false);
  });

  it("should return false for an empty payload", () => {
    const dummySig = signPayload("something");
    // Wrong payload
    expect(verifySignature("", dummySig, publicKey)).toBe(false);
  });
});