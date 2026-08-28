/**
 * LocalStorage Encryption Utility (`crypto-storage.ts`)
 *
 * Security Architecture & Encryption Approach:
 * ============================================
 * 1. Key Derivation:
 *    - Uses user's Stellar public key (wallet address) when connected to derive a 256-bit encryption key.
 *    - Key derivation algorithm: `CryptoJS.SHA256(publicKey).toString()`.
 *    - If no Stellar public key is provided (unauthenticated session), a deterministic application
 *      fallback secret key hash is used: `CryptoJS.SHA256(FALLBACK_SALT).toString()`.
 *
 * 2. AES Encryption & Storage Payload:
 *    - Data payloads are serialized to JSON strings and encrypted using AES (`CryptoJS.AES.encrypt`).
 *    - Encrypted data stored in localStorage is tagged with an identification prefix (`ENC_V1:`).
 *    - This prefix allows instant, deterministic detection of encrypted vs. unencrypted legacy data.
 *
 * 3. Legacy Migration Strategy:
 *    - On reading data from localStorage, if the stored string is detected as legacy unencrypted plaintext,
 *      it is safely parsed and automatically re-encrypted with `setItemAndEncrypt`.
 *
 * 4. Warning & Decryption Failure Handling:
 *    - If decryption fails (e.g. wrong wallet key connected or corrupted data payload in localStorage),
 *      a warning is logged (`console.warn`) and optionally surfaced via toast/callback, returning `null`
 *      to ensure app stability without runtime crashes.
 */

import CryptoJS from "crypto-js";
import { toast } from "sonner";

/** Prefix used to identify encrypted localStorage values */
export const ENCRYPTION_PREFIX = "ENC_V1:";

/** Fallback salt for key derivation when Stellar wallet is not connected */
const FALLBACK_SALT = "dongle_sensitive_storage_fallback_salt_2026";

export interface DecryptOptions {
  /** Callback triggered when decryption fails or encounters corrupted payload */
  onWarning?: (warningMessage: string) => void;
  /** Whether to log a console warning on failure (default: true) */
  showConsoleWarning?: boolean;
  /** Whether to trigger a toast notification warning (default: false) */
  showToastWarning?: boolean;
}

/**
 * Derives an AES encryption key hex string using SHA-256 hash of the Stellar public key.
 *
 * @param publicKey - Optional user Stellar public key (e.g. "GABC...")
 * @returns SHA-256 hash string used as secret key for AES
 */
export function deriveEncryptionKey(publicKey?: string | null): string {
  const rawKey = publicKey && publicKey.trim() ? publicKey.trim() : FALLBACK_SALT;
  return CryptoJS.SHA256(rawKey).toString();
}

/**
 * Checks whether a raw string from localStorage is encrypted using ENCRYPTION_PREFIX.
 *
 * @param data - Raw string retrieved from localStorage
 * @returns True if encrypted with prefix
 */
export function isEncrypted(data: string | null): boolean {
  if (!data) return false;
  return data.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Encrypts a JavaScript object or string into an AES ciphertext tagged with ENCRYPTION_PREFIX.
 * Uses SHA-256 hash of user's Stellar public key for AES key.
 *
 * @param data - Data payload to encrypt
 * @param publicKey - Optional Stellar public key for key derivation
 * @returns Encrypted payload string with ENCRYPTION_PREFIX
 */
export function encryptData<T>(data: T, publicKey?: string | null): string {
  try {
    const keyHash = deriveEncryptionKey(publicKey);
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, keyHash).toString();
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw error;
  }
}

/**
 * Decrypts an encrypted ciphertext from localStorage.
 * Shows a warning if decryption fails (e.g. wrong key or corrupted payload).
 *
 * @param encryptedString - Ciphertext string starting with ENCRYPTION_PREFIX
 * @param publicKey - Optional Stellar public key used to derive decryption key
 * @param options - Warning and error handling options
 * @returns Decrypted object of type T, or null if decryption fails
 */
export function decryptData<T>(
  encryptedString: string | null,
  publicKey?: string | null,
  options: DecryptOptions = {}
): T | null {
  if (!encryptedString) return null;

  const { onWarning, showConsoleWarning = true, showToastWarning = false } = options;

  if (!isEncrypted(encryptedString)) {
    return null;
  }

  const ciphertext = encryptedString.slice(ENCRYPTION_PREFIX.length);
  const keyHash = deriveEncryptionKey(publicKey);

  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, keyHash);
    const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedJson) {
      const warningMsg = "Failed to decrypt sensitive data: Key mismatch or corrupted data.";
      if (showConsoleWarning) {
        console.warn(`[CryptoStorage Warning] ${warningMsg}`);
      }
      if (showToastWarning && typeof window !== "undefined") {
        toast.warning("Warning: Decryption failed for stored local data.");
      }
      if (onWarning) {
        onWarning(warningMsg);
      }
      return null;
    }

    return JSON.parse(decryptedJson) as T;
  } catch (error) {
    const warningMsg = `Decryption error: ${error instanceof Error ? error.message : "Malformed ciphertext"}`;
    if (showConsoleWarning) {
      console.warn(`[CryptoStorage Warning] ${warningMsg}`);
    }
    if (showToastWarning && typeof window !== "undefined") {
      toast.warning("Warning: Could not decrypt stored data.");
    }
    if (onWarning) {
      onWarning(warningMsg);
    }
    return null;
  }
}

/**
 * Helper to retrieve an item from localStorage, decrypting it if encrypted,
 * or auto-migrating it if stored in legacy unencrypted JSON format.
 *
 * @param key - localStorage key
 * @param publicKey - Optional Stellar public key
 * @param options - Decryption warning options
 * @returns Parsed payload T, or null if missing or decryption failed
 */
export function getItemAndDecrypt<T>(
  key: string,
  publicKey?: string | null,
  options?: DecryptOptions
): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    // Encrypted payload handling
    if (isEncrypted(raw)) {
      return decryptData<T>(raw, publicKey, options);
    }

    // Legacy unencrypted plaintext handling -> migrate to encrypted storage
    try {
      const parsed = JSON.parse(raw) as T;
      // Auto-migrate: overwrite with encrypted version
      setItemAndEncrypt(key, parsed, publicKey);
      return parsed;
    } catch {
      const warningMsg = `Failed to parse legacy unencrypted item for storage key "${key}"`;
      if (options?.showConsoleWarning ?? true) {
        console.warn(`[CryptoStorage Warning] ${warningMsg}`);
      }
      if (options?.onWarning) {
        options.onWarning(warningMsg);
      }
      return null;
    }
  } catch (error) {
    console.error(`Error reading key "${key}" from localStorage:`, error);
    return null;
  }
}

/**
 * Helper to encrypt a data payload and store it in localStorage.
 *
 * @param key - localStorage key
 * @param data - Payload to encrypt and store
 * @param publicKey - Optional Stellar public key
 */
export function setItemAndEncrypt<T>(
  key: string,
  data: T,
  publicKey?: string | null
): void {
  if (typeof window === "undefined") return;

  try {
    const encrypted = encryptData(data, publicKey);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error(`Error writing encrypted item to key "${key}" in localStorage:`, error);
  }
}
