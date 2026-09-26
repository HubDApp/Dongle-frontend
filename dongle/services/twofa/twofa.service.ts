/**
 * Two-Factor Authentication Service
 *
 * Provides client-side 2FA using:
 * - TOTP (Time-based One-Time Password) via Web Crypto API (RFC 6238 compatible)
 * - SMS verification (simulated)
 * - Email verification (simulated)
 * - Backup codes (single-use)
 *
 * All configuration is stored encrypted in localStorage via the existing
 * crypto-storage module.
 */

import {
  type TwoFAConfig,
  type TwoFAMethod,
  type TwoFAMethodConfig,
  type BackupCode,
  type TwoFASession,
  type TwoFAVerificationResult,
  DEFAULT_TWOFA_CONFIG,
} from "@/types/twofa";
import { getItemAndDecrypt, setItemAndEncrypt } from "@/lib/crypto-storage";

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "dongle_twofa_config";
const SESSION_KEY = "dongle_twofa_session";

/** TOTP time step in seconds (RFC 6238 default) */
const TOTP_TIME_STEP = 30;

/** Number of backup codes to generate */
const BACKUP_CODE_COUNT = 10;

/** Length of each backup code (alphanumeric) */
const BACKUP_CODE_LENGTH = 10;

/** Maximum verification attempts per session */
const MAX_ATTEMPTS = 3;

/** TOTP code length (standard 6 digits) */
const TOTP_CODE_LENGTH = 6;

// ─── TOTP Implementation (RFC 6238) ──────────────────────────────────────────

/**
 * Decode a base32 string to a Uint8Array.
 * Supports RFC 4648 base32 (without padding).
 */
function base32Decode(base32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.replace(/[^A-Za-z2-7]/g, "").toUpperCase();
  const bytes: number[] = [];

  let buffer = 0;
  let bitsLeft = 0;

  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Generate a random base32-encoded secret for TOTP.
 * Compliant with Google Authenticator format (16 bytes → 26 chars).
 */
function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/**
 * Encode bytes to base32 string (RFC 4648, no padding).
 */
function base32Encode(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";

  for (let i = 0; i < bytes.length; ) {
    let byte = bytes[i++]!;
    result += alphabet[byte >> 3];
    byte = (byte & 0x07) << 2;

    if (i < bytes.length) {
      byte |= bytes[i]! >> 6;
    }
    result += alphabet[byte];
    byte = (bytes[i] ?? 0) & 0x3f;

    if (i < bytes.length) {
      i++;
      result += alphabet[byte >> 1];
      byte = (byte & 0x01) << 4;

      if (i < bytes.length) {
        byte |= bytes[i]! >> 4;
      }
      result += alphabet[byte];
      byte = (bytes[i] ?? 0) & 0x0f;

      if (i < bytes.length) {
        i++;
        result += alphabet[byte << 1];
        byte = (bytes[i] ?? 0) & 0x7f;

        if (i < bytes.length) {
          i++;
          result += alphabet[byte >> 2];
          byte = (byte & 0x03) << 3;

          if (i < bytes.length) {
            byte |= bytes[i]! >> 5;
          }
          result += alphabet[byte];
          byte = (bytes[i] ?? 0) & 0x1f;

          if (i < bytes.length) {
            i++;
            result += alphabet[byte];
          } else {
            result += alphabet[byte << 3];
          }
        } else {
          result += alphabet[byte << 2];
        }
      } else {
        result += alphabet[byte << 1];
      }
    } else {
      result += alphabet[byte << 4];
    }
  }

  return result;
}

/**
 * Compute HMAC-SHA1 using Web Crypto API.
 */
async function computeHMACSHA1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message);
  return new Uint8Array(signature);
}

/**
 * Generate a TOTP code for a given secret and time counter.
 * Implements RFC 6238 / RFC 4226 (HOTP) algorithm.
 */
async function generateTotpCode(secret: Uint8Array, counter: bigint): Promise<string> {
  // Convert counter to 8-byte big-endian
  const msg = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    msg[i] = Number(counter & BigInt(0xff));
    counter >>= BigInt(8);
  }

  const hmac = await computeHMACSHA1(secret, msg);

  // Dynamic truncation (RFC 4226 section 5.3)
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binaryCode =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! << 16) & 0xff0000) |
    ((hmac[offset + 2]! << 8) & 0xff00) |
    (hmac[offset + 3]! & 0xff);

  // Mod 10^6 for a 6-digit code
  const otp = binaryCode % 10 ** TOTP_CODE_LENGTH;
  return otp.toString().padStart(TOTP_CODE_LENGTH, "0");
}

/**
 * Get the current TOTP time counter value.
 */
function getTotpCounter(time: number = Date.now()): bigint {
  return BigInt(Math.floor(time / 1000 / TOTP_TIME_STEP));
}

// ─── Backup Codes ────────────────────────────────────────────────────────────

/**
 * Generate a set of single-use backup codes.
 */
function generateBackupCodes(count: number = BACKUP_CODE_COUNT): BackupCode[] {
  const codes: BackupCode[] = [];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // Format as groups for readability
    const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
    codes.push({ code: formatted, used: false });
  }

  return codes;
}

// ─── SMS / Email Code Generation ─────────────────────────────────────────────

/**
 * Generate a random 6-digit verification code for SMS or email.
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Service Implementation ──────────────────────────────────────────────────

class TwoFAService {
  // ── Config persistence ──────────────────────────────────────────────────

  /**
   * Load the 2FA configuration from encrypted localStorage.
   */
  getConfig(publicKey?: string | null): TwoFAConfig {
    const stored = getItemAndDecrypt<TwoFAConfig>(STORAGE_KEY, publicKey);
    if (!stored) {
      return { ...DEFAULT_TWOFA_CONFIG };
    }
    return stored;
  }

  /**
   * Save the 2FA configuration to encrypted localStorage.
   */
  saveConfig(config: TwoFAConfig, publicKey?: string | null): void {
    const updated = { ...config, updatedAt: Date.now() };
    setItemAndEncrypt(STORAGE_KEY, updated, publicKey);
  }

  /**
   * Check if 2FA is enabled for the current user.
   */
  isEnabled(publicKey?: string | null): boolean {
    const config = this.getConfig(publicKey);
    return config.enabled;
  }

  /**
   * Check if 2FA is required for form submissions.
   */
  isRequiredForSubmissions(publicKey?: string | null): boolean {
    const config = this.getConfig(publicKey);
    return config.enabled && config.requiredForSubmissions;
  }

  /**
   * Get the available verification methods (ones that are fully set up).
   */
  getAvailableMethods(publicKey?: string | null): TwoFAMethod[] {
    const config = this.getConfig(publicKey);
    const methods: TwoFAMethod[] = [];

    if (config.methods.sms.enabled && config.methods.sms.phoneNumber) {
      methods.push("sms");
    }
    if (config.methods.email.enabled && config.methods.email.emailAddress) {
      methods.push("email");
    }
    if (config.methods.totp.enabled && config.methods.totp.totpVerified) {
      methods.push("totp");
    }

    return methods;
  }

  // ── Enable / Disable 2FA ────────────────────────────────────────────────

  /**
   * Enable 2FA globally. Also enables at least one method.
   */
  enable(config: TwoFAConfig, publicKey?: string | null): void {
    this.saveConfig({ ...config, enabled: true }, publicKey);
  }

  /**
   * Disable 2FA globally and reset all methods.
   */
  disable(publicKey?: string | null): void {
    this.saveConfig(
      {
        ...DEFAULT_TWOFA_CONFIG,
        updatedAt: Date.now(),
      },
      publicKey,
    );
  }

  // ── Method management ───────────────────────────────────────────────────

  /**
   * Enable SMS verification with a phone number.
   */
  enableSMS(
    phoneNumber: string,
    config: TwoFAConfig,
    publicKey?: string | null,
  ): void {
    const updated: TwoFAConfig = {
      ...config,
      enabled: true,
      methods: {
        ...config.methods,
        sms: {
          enabled: true,
          phoneNumber: this.maskPhoneNumber(phoneNumber),
        },
      },
    };
    this.saveConfig(updated, publicKey);
  }

  /**
   * Enable email verification.
   */
  enableEmail(
    emailAddress: string,
    config: TwoFAConfig,
    publicKey?: string | null,
  ): void {
    const updated: TwoFAConfig = {
      ...config,
      enabled: true,
      methods: {
        ...config.methods,
        email: {
          enabled: true,
          emailAddress: this.maskEmail(emailAddress),
        },
      },
    };
    this.saveConfig(updated, publicKey);
  }

  /**
   * Enable TOTP after verifying the setup code.
   */
  enableTOTP(
    secret: string,
    config: TwoFAConfig,
    publicKey?: string | null,
  ): void {
    const updated: TwoFAConfig = {
      ...config,
      enabled: true,
      methods: {
        ...config.methods,
        totp: {
          enabled: true,
          totpSecret: secret,
          totpVerified: true,
        },
      },
    };
    this.saveConfig(updated, publicKey);
  }

  /**
   * Disable a specific 2FA method.
   */
  disableMethod(method: TwoFAMethod, publicKey?: string | null): void {
    const config = this.getConfig(publicKey);
    const methodConfig: TwoFAMethodConfig =
      method === "sms"
        ? { enabled: false }
        : method === "email"
          ? { enabled: false }
          : { enabled: false, totpVerified: false };

    const methods = { ...config.methods, [method]: methodConfig };

    // If all methods are now disabled, disable 2FA entirely
    const anyEnabled = Object.values(methods).some((m) => m.enabled);

    this.saveConfig(
      {
        ...config,
        enabled: anyEnabled,
        methods,
      },
      publicKey,
    );
  }

  // ── Backup Codes ─────────────────────────────────────────────────────────

  /**
   * Get the current backup codes.
   */
  getBackupCodes(publicKey?: string | null): BackupCode[] {
    const config = this.getConfig(publicKey);
    return config.backupCodes;
  }

  /**
   * Generate and store new backup codes.
   */
  regenerateBackupCodes(publicKey?: string | null): BackupCode[] {
    const config = this.getConfig(publicKey);
    const codes = generateBackupCodes();
    this.saveConfig({ ...config, backupCodes: codes }, publicKey);
    return codes;
  }

  /**
   * Get the count of remaining unused backup codes.
   */
  getRemainingBackupCodeCount(publicKey?: string | null): number {
    const config = this.getConfig(publicKey);
    return config.backupCodes.filter((bc) => !bc.used).length;
  }

  // ── Verification ─────────────────────────────────────────────────────────

  /**
   * Create a verification session (generates and "sends" a code for SMS/email).
   * Returns the session; the code is stored in-memory only.
   */
  createSession(method: TwoFAMethod, publicKey?: string | null): TwoFASession {
    const session: TwoFASession = {
      method,
      createdAt: Date.now(),
      attemptsRemaining: MAX_ATTEMPTS,
    };

    if (method === "sms" || method === "email") {
      session.sentCode = generateVerificationCode();
      // In a real app, this would send via SMS/email API
      // For now, we surface the code through the session for demo/testing
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return session;
  }

  /**
   * Get the current verification session.
   */
  getSession(): TwoFASession | null {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TwoFASession;
    } catch {
      return null;
    }
  }

  /**
   * Clear the current verification session.
   */
  clearSession(): void {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  /**
   * Verify a provided code against the expected method.
   */
  async verifyCode(
    method: TwoFAMethod,
    code: string,
    publicKey?: string | null,
  ): Promise<TwoFAVerificationResult> {
    const config = this.getConfig(publicKey);
    const session = this.getSession();

    // Check attempts
    if (session && session.attemptsRemaining <= 0) {
      this.clearSession();
      return { success: false, method, error: "Too many attempts. Please try again." };
    }

    // Decrement attempts
    if (session) {
      const updatedSession = { ...session, attemptsRemaining: session.attemptsRemaining - 1 };
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
      }
    }

    try {
      switch (method) {
        case "sms":
        case "email": {
          if (!session || !session.sentCode) {
            return { success: false, method, error: "No verification code was sent. Please request a new one." };
          }
          if (code.trim() !== session.sentCode) {
            return { success: false, method, error: "Invalid verification code. Please try again." };
          }
          this.clearSession();
          return { success: true, method };
        }

        case "totp": {
          const totpConfig = config.methods.totp;
          if (!totpConfig.enabled || !totpConfig.totpSecret) {
            return { success: false, method, error: "TOTP is not configured." };
          }
          const isValid = await this.verifyTotpCode(totpConfig.totpSecret, code);
          if (!isValid) {
            return { success: false, method, error: "Invalid TOTP code. Please try again." };
          }
          this.clearSession();
          return { success: true, method };
        }

        case "backup_code": {
          const codes = config.backupCodes;
          const matchIndex = codes.findIndex((bc) => !bc.used && bc.code === code.trim());
          if (matchIndex === -1) {
            return { success: false, method, error: "Invalid or already used backup code." };
          }
          // Mark the backup code as used
          const updatedCodes = codes.map((bc, i) =>
            i === matchIndex ? { ...bc, used: true } : bc,
          );
          this.saveConfig(
            { ...config, backupCodes: updatedCodes },
            publicKey,
          );
          this.clearSession();
          return { success: true, method };
        }

        default:
          return { success: false, method, error: "Unknown verification method." };
      }
    } catch (error) {
      return {
        success: false,
        method,
        error: `Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Verify a TOTP code against a secret.
   * Checks current and adjacent time steps for clock drift.
   */
  async verifyTotpCode(secretBase32: string, code: string): Promise<boolean> {
    try {
      const secret = base32Decode(secretBase32);
      const counter = getTotpCounter();

      // Check current, previous, and next time step (allows ±30s drift)
      for (let offset = -1; offset <= 1; offset++) {
        const expected = await generateTotpCode(secret, counter + BigInt(offset));
        if (expected === code.trim()) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generate a new TOTP secret for setup purposes.
   */
  generateTotpSecret(): string {
    return generateTotpSecret();
  }

  /**
   * Generate a totp:// URI for QR code setup (compatible with Google Authenticator).
   */
  generateTotpUri(secret: string, accountName: string = "Dongle"): string {
    const encodedIssuer = encodeURIComponent("Dongle");
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Get the masked phone number for display.
   */
  getMaskedPhoneNumber(publicKey?: string | null): string | undefined {
    const config = this.getConfig(publicKey);
    return config.methods.sms.phoneNumber;
  }

  /**
   * Get the masked email address for display.
   */
  getMaskedEmail(publicKey?: string | null): string | undefined {
    const config = this.getConfig(publicKey);
    return config.methods.email.emailAddress;
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return phone;
    const visible = phone.slice(-4);
    const masked = phone.slice(0, -4).replace(/\d/g, "*");
    return masked + visible;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    if (local.length <= 2) return `${local.slice(0, 1)}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }

  /**
   * Set whether 2FA is required for form submissions.
   */
  setRequiredForSubmissions(required: boolean, publicKey?: string | null): void {
    const config = this.getConfig(publicKey);
    this.saveConfig({ ...config, requiredForSubmissions: required }, publicKey);
  }
}

/** Singleton instance of the 2FA service */
export const twoFAService = new TwoFAService();