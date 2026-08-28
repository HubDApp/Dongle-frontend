/**
 * Tests for crypto-storage utility
 *
 * Covers:
 *   1. Key derivation with user's Stellar public key hash (SHA-256) and fallback
 *   2. AES encryption and decryption using crypto-js
 *   3. Migration of legacy unencrypted JSON data on read
 *   4. Warnings emitted when decryption fails (key mismatch or corrupt ciphertext)
 *   5. Helper functions (getItemAndDecrypt, setItemAndEncrypt, isEncrypted)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  deriveEncryptionKey,
  isEncrypted,
  encryptData,
  decryptData,
  getItemAndDecrypt,
  setItemAndEncrypt,
  ENCRYPTION_PREFIX,
} from "@/lib/crypto-storage";
import CryptoJS from "crypto-js";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

const STELLAR_PUBKEY_1 = "GA7Q2Q7UT4B52Q46NBDTYWV2B4N24E5X73LXZJ35N4N4M67W5P7P7P7P";
const STELLAR_PUBKEY_2 = "GBXXXXX2222222222222222222222222222222222222222222222222";

describe("crypto-storage utility", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  describe("1. Key Derivation with Stellar Public Key Hash", () => {
    it("derives encryption key using SHA-256 hash of user's Stellar public key", () => {
      const derivedKey = deriveEncryptionKey(STELLAR_PUBKEY_1);
      const expectedHash = CryptoJS.SHA256(STELLAR_PUBKEY_1).toString();
      expect(derivedKey).toBe(expectedHash);
    });

    it("derives consistent key for the same public key", () => {
      const keyA = deriveEncryptionKey(STELLAR_PUBKEY_1);
      const keyB = deriveEncryptionKey(STELLAR_PUBKEY_1);
      expect(keyA).toBe(keyB);
    });

    it("derives different keys for different Stellar public keys", () => {
      const key1 = deriveEncryptionKey(STELLAR_PUBKEY_1);
      const key2 = deriveEncryptionKey(STELLAR_PUBKEY_2);
      expect(key1).not.toBe(key2);
    });

    it("uses deterministic fallback key hash when no Stellar public key provided", () => {
      const keyNull = deriveEncryptionKey(null);
      const keyUndefined = deriveEncryptionKey(undefined);
      const keyEmpty = deriveEncryptionKey("");
      expect(keyNull).toBe(keyUndefined);
      expect(keyNull).toBe(keyEmpty);
    });
  });

  describe("2. Encryption & Decryption with crypto-js", () => {
    it("encrypts data with ENCRYPTION_PREFIX and AES ciphertext", () => {
      const payload = { name: "Test Draft", category: "defi" };
      const encrypted = encryptData(payload, STELLAR_PUBKEY_1);

      expect(encrypted.startsWith(ENCRYPTION_PREFIX)).toBe(true);
      expect(isEncrypted(encrypted)).toBe(true);
      // Plaintext should not be visible in raw output
      expect(encrypted).not.toContain("Test Draft");
    });

    it("decrypts ciphertext encrypted with matching Stellar public key", () => {
      const payload = { id: "draft-1", data: { name: "Secret DApp" } };
      const encrypted = encryptData(payload, STELLAR_PUBKEY_1);
      const decrypted = decryptData<typeof payload>(encrypted, STELLAR_PUBKEY_1);

      expect(decrypted).toEqual(payload);
    });

    it("setItemAndEncrypt and getItemAndDecrypt round-trip", () => {
      const testKey = "test_encrypted_key";
      const testData = [{ id: "1", text: "Sensitive info" }];

      setItemAndEncrypt(testKey, testData, STELLAR_PUBKEY_1);

      // Verify raw stored item in localStorage is encrypted
      const rawStored = localStorage.getItem(testKey);
      expect(rawStored).not.toBeNull();
      expect(isEncrypted(rawStored)).toBe(true);
      expect(rawStored).not.toContain("Sensitive info");

      // Verify getItemAndDecrypt returns original data
      const readBack = getItemAndDecrypt<typeof testData>(testKey, STELLAR_PUBKEY_1);
      expect(readBack).toEqual(testData);
    });
  });

  describe("3. Migration of Legacy Unencrypted Drafts", () => {
    it("automatically migrates unencrypted legacy JSON drafts to encrypted storage on read", () => {
      const testKey = "legacy_draft_key";
      const legacyPlaintext = JSON.stringify([{ id: "legacy-1", name: "Unencrypted Draft" }]);

      // Store unencrypted legacy JSON
      localStorage.setItem(testKey, legacyPlaintext);
      expect(isEncrypted(localStorage.getItem(testKey))).toBe(false);

      // Read back with getItemAndDecrypt
      const result = getItemAndDecrypt<Array<{ id: string; name: string }>>(testKey, STELLAR_PUBKEY_1);

      // 1. Data is successfully parsed
      expect(result).toEqual([{ id: "legacy-1", name: "Unencrypted Draft" }]);

      // 2. Storage key is now migrated to encrypted format
      const migratedRaw = localStorage.getItem(testKey);
      expect(isEncrypted(migratedRaw)).toBe(true);
      expect(migratedRaw).not.toContain("Unencrypted Draft");
    });
  });

  describe("4. Warning Handling on Decryption Failure", () => {
    it("logs a console warning when decryption fails due to key mismatch", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Encrypt with PUBKEY_1
      const encrypted = encryptData({ draft: "secret" }, STELLAR_PUBKEY_1);

      // Attempt to decrypt with PUBKEY_2
      const result = decryptData(encrypted, STELLAR_PUBKEY_2);

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain("[CryptoStorage Warning]");
    });

    it("triggers onWarning callback when decryption fails", () => {
      const warningCallback = vi.fn();
      const encrypted = encryptData({ data: "test" }, STELLAR_PUBKEY_1);

      const result = decryptData(encrypted, STELLAR_PUBKEY_2, {
        onWarning: warningCallback,
      });

      expect(result).toBeNull();
      expect(warningCallback).toHaveBeenCalledWith(
        expect.stringContaining("Failed to decrypt sensitive data")
      );
    });

    it("logs warning for corrupted ciphertext payload", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const corruptedString = `${ENCRYPTION_PREFIX}INVALID_GARBAGE_CIPHERTEXT`;

      const result = decryptData(corruptedString, STELLAR_PUBKEY_1);

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
