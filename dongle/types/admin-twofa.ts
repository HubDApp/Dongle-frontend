/**
 * Admin two-factor authentication types (Issue #728).
 *
 * This is a server-side concern, separate from the client-side user 2FA in
 * types/twofa.ts. Admin 2FA gates access to /api/admin/* and the admin login.
 */

/** Methods an admin can register. */
export type AdminTwoFAMethod = "totp" | "sms" | "webauthn" | "backup_code";

/** A single-use recovery code. Only a hash is persisted. */
export interface AdminBackupCode {
  /** SHA-256 hex hash of the code — the plaintext is never stored. */
  hash: string;
  used: boolean;
  usedAt?: string;
}

/** A registered WebAuthn credential (public-key only, never the private key). */
export interface AdminWebAuthnCredential {
  credentialId: string;
  /** Base64url-encoded COSE public key. */
  publicKey: string;
  signCount: number;
  registeredAt: string;
  label?: string;
}

/** Full per-admin 2FA configuration (server-side). */
export interface AdminTwoFAConfig {
  /** Stellar public key of the admin. */
  publicKey: string;
  enabled: boolean;
  /** Base32-encoded TOTP secret (shared secret). */
  totpSecret?: string;
  totpVerified: boolean;
  /** Masked phone number for SMS. */
  smsPhoneNumber?: string;
  smsVerified: boolean;
  webauthnCredentials: AdminWebAuthnCredential[];
  backupCodes: AdminBackupCode[];
  createdAt: string;
  updatedAt: string;
}

/** Result of verifying an admin 2FA challenge. */
export interface AdminTwoFAVerifyResult {
  success: boolean;
  method: AdminTwoFAMethod;
  error?: string;
  /** True when a backup code was consumed. */
  backupCodeUsed?: boolean;
}

/** A pending WebAuthn registration/authentication challenge. */
export interface AdminWebAuthnChallenge {
  challenge: string;
  publicKey: string;
  type: "registration" | "authentication";
  createdAt: number;
}

export const ADMIN_2FA_BACKUP_CODE_COUNT = 10;

/** Default config for an admin who has not yet enrolled. */
export function createDefaultAdminTwoFAConfig(publicKey: string): AdminTwoFAConfig {
  const now = new Date().toISOString();
  return {
    publicKey,
    enabled: false,
    totpVerified: false,
    smsVerified: false,
    webauthnCredentials: [],
    backupCodes: [],
    createdAt: now,
    updatedAt: now,
  };
}
