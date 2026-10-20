/**
 * Admin Two-Factor Authentication Service (Issue #728).
 *
 * Server-side only. Stores per-admin 2FA config in Redis (shared across
 * instances) with an in-process Map fallback, mirroring lib/cache.ts.
 *
 * Supported methods:
 * - TOTP (Google Authenticator-compatible) — primary.
 * - SMS — a 6-digit code is generated and (for now) surfaced through the
 *   session for delivery by the caller; the phone number is masked at rest.
 * - WebAuthn — challenge/response registration & assertions (public-key only).
 * - 10 single-use backup codes (stored as SHA-256 hashes).
 */

import { redis } from "@/lib/redis";
import {
  adminTwoFAConfigKey,
  adminWebAuthnChallengeKey,
} from "./keys";
import {
  ADMIN_2FA_BACKUP_CODE_COUNT,
  createDefaultAdminTwoFAConfig,
  type AdminBackupCode,
  type AdminTwoFAConfig,
  type AdminTwoFAMethod,
  type AdminTwoFAVerifyResult,
  type AdminWebAuthnChallenge,
  type AdminWebAuthnCredential,
} from "@/types/admin-twofa";
import {
  buildTotpUri,
  generateTotpSecret,
  verifyTotp,
} from "@/lib/totp";

// ── Storage (Redis-first with in-memory fallback) ─────────────────────────────

const fallbackConfigs = new Map<string, AdminTwoFAConfig>();
const fallbackChallenges = new Map<string, AdminWebAuthnChallenge>();

async function loadConfig(publicKey: string): Promise<AdminTwoFAConfig> {
  if (redis) {
    try {
      const raw = await redis.get<string>(adminTwoFAConfigKey(publicKey));
      if (raw) {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return { ...createDefaultAdminTwoFAConfig(publicKey), ...parsed };
      }
      return createDefaultAdminTwoFAConfig(publicKey);
    } catch {
      // fall through to in-process
    }
  }
  return fallbackConfigs.get(publicKey) ?? createDefaultAdminTwoFAConfig(publicKey);
}

async function saveConfig(config: AdminTwoFAConfig): Promise<void> {
  const updated = { ...config, updatedAt: new Date().toISOString() };
  if (redis) {
    try {
      await redis.set(adminTwoFAConfigKey(config.publicKey), JSON.stringify(updated));
      return;
    } catch {
      // fall through to in-process
    }
  }
  fallbackConfigs.set(config.publicKey, updated);
}

// ── Hashing helpers ───────────────────────────────────────────────────────────

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
}

function randomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function randomBackupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  for (let i = 0; i < 10; i++) {
    raw += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

/** Constant-time-ish string comparison for secrets. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const adminTwoFAService = {
  async getConfig(publicKey: string): Promise<AdminTwoFAConfig> {
    return loadConfig(publicKey);
  },

  async isEnabled(publicKey: string): Promise<boolean> {
    return (await loadConfig(publicKey)).enabled;
  },

  /** The methods that are fully verified and usable for sign-in. */
  async getEnabledMethods(publicKey: string): Promise<AdminTwoFAMethod[]> {
    const config = await loadConfig(publicKey);
    if (!config.enabled) return [];
    const methods: AdminTwoFAMethod[] = [];
    if (config.totpVerified && config.totpSecret) methods.push("totp");
    if (config.smsVerified && config.smsPhoneNumber) methods.push("sms");
    if (config.webauthnCredentials.length > 0) methods.push("webauthn");
    return methods;
  },

  // ── TOTP ──────────────────────────────────────────────────────────────────

  /** Begin TOTP enrolment: generate + persist a secret (not yet verified). */
  async beginTotpSetup(
    publicKey: string,
  ): Promise<{ secret: string; uri: string }> {
    const config = await loadConfig(publicKey);
    const secret = generateTotpSecret();
    await saveConfig({ ...config, totpSecret: secret, totpVerified: false });
    return { secret, uri: buildTotpUri(secret, publicKey) };
  },

  /** Confirm TOTP enrolment with a code from the authenticator app. */
  async confirmTotpSetup(
    publicKey: string,
    code: string,
    atTime: number = Date.now(),
  ): Promise<AdminTwoFAVerifyResult> {
    const config = await loadConfig(publicKey);
    if (!config.totpSecret) {
      return { success: false, method: "totp", error: "No TOTP secret in progress." };
    }
    const ok = await verifyTotp(config.totpSecret, code, atTime);
    if (!ok) {
      return { success: false, method: "totp", error: "Invalid TOTP code." };
    }
    const backupCodes = await generateBackupCodeSet();
    await saveConfig({
      ...config,
      enabled: true,
      totpVerified: true,
      backupCodes,
    });
    return { success: true, method: "totp" };
  },

  async verifyTotp(
    publicKey: string,
    code: string,
    atTime: number = Date.now(),
  ): Promise<AdminTwoFAVerifyResult> {
    const config = await loadConfig(publicKey);
    if (!config.totpVerified || !config.totpSecret) {
      return { success: false, method: "totp", error: "TOTP is not configured." };
    }
    const ok = await verifyTotp(config.totpSecret, code, atTime);
    return ok
      ? { success: true, method: "totp" }
      : { success: false, method: "totp", error: "Invalid TOTP code." };
  },

  // ── SMS ───────────────────────────────────────────────────────────────────

  /**
   * Begin SMS setup: store a masked phone number and return the code to send.
   * The plaintext code is returned to the caller (delivery is out of scope).
   */
  async beginSmsSetup(
    publicKey: string,
    phoneNumber: string,
  ): Promise<{ code: string; maskedPhoneNumber: string }> {
    const config = await loadConfig(publicKey);
    const code = randomCode();
    const masked = maskPhone(phoneNumber);
    await saveConfig({
      ...config,
      smsPhoneNumber: masked,
      smsVerified: false,
    });
    return { code, maskedPhoneNumber: masked };
  },

  /** Confirm SMS setup by echoing the code that was sent. */
  async confirmSmsSetup(
    publicKey: string,
    code: string,
    expectedCode: string,
  ): Promise<AdminTwoFAVerifyResult> {
    const config = await loadConfig(publicKey);
    if (!config.smsPhoneNumber) {
      return { success: false, method: "sms", error: "No phone number in progress." };
    }
    if (!safeEqual(code.trim(), expectedCode.trim())) {
      return { success: false, method: "sms", error: "Invalid SMS code." };
    }
    const backupCodes = config.backupCodes.length ? config.backupCodes : await generateBackupCodeSet();
    await saveConfig({ ...config, enabled: true, smsVerified: true, backupCodes });
    return { success: true, method: "sms" };
  },

  // ── WebAuthn ────────────────────────────────────────────────────────────────

  /** Create a registration challenge for a new hardware key. */
  async beginWebAuthnRegistration(
    publicKey: string,
  ): Promise<AdminWebAuthnChallenge> {
    const challenge: AdminWebAuthnChallenge = {
      challenge: base64url(crypto.getRandomValues(new Uint8Array(32))),
      publicKey,
      type: "registration",
      createdAt: Date.now(),
    };
    await storeChallenge(challenge);
    return challenge;
  },

  /** Create an authentication challenge for an existing credential. */
  async beginWebAuthnAuthentication(
    publicKey: string,
  ): Promise<AdminWebAuthnChallenge> {
    const challenge: AdminWebAuthnChallenge = {
      challenge: base64url(crypto.getRandomValues(new Uint8Array(32))),
      publicKey,
      type: "authentication",
      createdAt: Date.now(),
    };
    await storeChallenge(challenge);
    return challenge;
  },

  /** Read the most recent WebAuthn challenge for an admin (5-min TTL). */
  async getWebAuthnChallenge(
    publicKey: string,
  ): Promise<AdminWebAuthnChallenge | null> {
    if (redis) {
      try {
        const raw = await redis.get<string>(adminWebAuthnChallengeKey(publicKey));
        if (raw) return (typeof raw === "string" ? JSON.parse(raw) : raw) as AdminWebAuthnChallenge;
        return null;
      } catch {
        // fall through
      }
    }
    return fallbackChallenges.get(publicKey) ?? null;
  },

  /**
   * Register a credential. The caller (route handler) is responsible for full
   * attestation verification; this records the resulting public key material.
   */
  async registerWebAuthnCredential(
    publicKey: string,
    credential: Omit<AdminWebAuthnCredential, "registeredAt" | "signCount">,
  ): Promise<AdminTwoFAConfig> {
    const config = await loadConfig(publicKey);
    const stored: AdminWebAuthnCredential = {
      ...credential,
      signCount: 0,
      registeredAt: new Date().toISOString(),
    };
    const backupCodes = config.backupCodes.length ? config.backupCodes : await generateBackupCodeSet();
    const updated = await saveConfigReturning({
      ...config,
      enabled: true,
      webauthnCredentials: [...config.webauthnCredentials, stored],
      backupCodes,
    });
    return updated;
  },

  /** Verify a WebAuthn assertion's sign counter is monotonic. */
  async verifyWebAuthnAssertion(
    publicKey: string,
    credentialId: string,
    newSignCount: number,
  ): Promise<AdminTwoFAVerifyResult> {
    const config = await loadConfig(publicKey);
    const credential = config.webauthnCredentials.find(
      (c) => c.credentialId === credentialId,
    );
    if (!credential) {
      return { success: false, method: "webauthn", error: "Unknown credential." };
    }
    if (newSignCount < credential.signCount) {
      return {
        success: false,
        method: "webauthn",
        error: "Sign counter regression — possible cloned authenticator.",
      };
    }
    const updated = config.webauthnCredentials.map((c) =>
      c.credentialId === credentialId ? { ...c, signCount: newSignCount } : c,
    );
    await saveConfig({ ...config, webauthnCredentials: updated });
    return { success: true, method: "webauthn" };
  },

  // ── Backup codes ────────────────────────────────────────────────────────────

  async regenerateBackupCodes(publicKey: string): Promise<string[]> {
    const config = await loadConfig(publicKey);
    const plaintext = Array.from({ length: ADMIN_2FA_BACKUP_CODE_COUNT }, () =>
      randomBackupCode(),
    );
    const hashed: AdminBackupCode[] = await Promise.all(
      plaintext.map(async (code) => ({
        hash: await hashBackupCode(code),
        used: false,
      })),
    );
    await saveConfig({ ...config, backupCodes: hashed });
    return plaintext;
  },

  async getRemainingBackupCodeCount(publicKey: string): Promise<number> {
    const config = await loadConfig(publicKey);
    return config.backupCodes.filter((c) => !c.used).length;
  },

  /** Verify (and consume) a backup code. */
  async verifyBackupCode(
    publicKey: string,
    code: string,
  ): Promise<AdminTwoFAVerifyResult> {
    const config = await loadConfig(publicKey);
    const hash = await hashBackupCode(code.trim());
    const index = config.backupCodes.findIndex(
      (c) => !c.used && safeEqual(c.hash, hash),
    );
    if (index === -1) {
      return {
        success: false,
        method: "backup_code",
        error: "Invalid or already used backup code.",
      };
    }
    const updated = config.backupCodes.map((c, i) =>
      i === index ? { ...c, used: true, usedAt: new Date().toISOString() } : c,
    );
    await saveConfig({ ...config, backupCodes: updated });
    return { success: true, method: "backup_code", backupCodeUsed: true };
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Disable 2FA and remove all enrolled methods + backup codes. */
  async disable(publicKey: string): Promise<void> {
    await saveConfig({
      ...createDefaultAdminTwoFAConfig(publicKey),
      enabled: false,
    });
  },

  /** Test helper — wipe in-process fallback state. */
  _resetFallback(): void {
    fallbackConfigs.clear();
    fallbackChallenges.clear();
  },
};

// ── Internal helpers ──────────────────────────────────────────────────────────

async function saveConfigReturning(config: AdminTwoFAConfig): Promise<AdminTwoFAConfig> {
  await saveConfig(config);
  return loadConfig(config.publicKey);
}

async function hashBackupCode(code: string): Promise<string> {
  return sha256Hex(code.trim().toUpperCase());
}

async function generateBackupCodeSet(): Promise<AdminBackupCode[]> {
  const plaintext = Array.from({ length: ADMIN_2FA_BACKUP_CODE_COUNT }, () =>
    randomBackupCode(),
  );
  const hashed = await Promise.all(plaintext.map((code) => hashBackupCode(code)));
  return hashed.map((hash) => ({ hash, used: false }));
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function storeChallenge(challenge: AdminWebAuthnChallenge): Promise<void> {
  if (redis) {
    try {
      await redis.set(adminWebAuthnChallengeKey(challenge.publicKey), JSON.stringify(challenge), {
        ex: 300,
      });
      return;
    } catch {
      // fall through
    }
  }
  fallbackChallenges.set(challenge.publicKey, challenge);
}

export { maskPhone, buildTotpUri, generateTotpSecret };
