/**
 * Two-Factor Authentication (2FA) type definitions
 */

/** Supported 2FA verification methods */
export type TwoFAMethod = "sms" | "email" | "totp" | "backup_code";

/** Configuration for a single 2FA method */
export interface TwoFAMethodConfig {
  enabled: boolean;
  /** Phone number for SMS verification (masked on read) */
  phoneNumber?: string;
  /** Email address for email verification (masked on read) */
  emailAddress?: string;
  /** Base32-encoded TOTP secret */
  totpSecret?: string;
  /** Whether TOTP has been verified (confirmed by the user) */
  totpVerified?: boolean;
}

/** An individual backup code */
export interface BackupCode {
  code: string;
  used: boolean;
}

/** Full 2FA configuration stored locally */
export interface TwoFAConfig {
  /** Whether 2FA is enabled at all */
  enabled: boolean;
  /** Whether 2FA is required for form submissions */
  requiredForSubmissions: boolean;
  /** Per-method configuration */
  methods: Record<TwoFAMethod, TwoFAMethodConfig>;
  /** List of backup codes */
  backupCodes: BackupCode[];
  /** Timestamp of last configuration update */
  updatedAt: number;
}

/** Session state for an in-progress 2FA verification */
export interface TwoFASession {
  /** The verification method selected */
  method: TwoFAMethod;
  /** The code that was sent (only held in memory for SMS/email simulation) */
  sentCode?: string;
  /** When the session was created */
  createdAt: number;
  /** Number of attempts remaining */
  attemptsRemaining: number;
}

/** Result of a 2FA verification attempt */
export interface TwoFAVerificationResult {
  success: boolean;
  method: TwoFAMethod;
  /** Error message if verification failed */
  error?: string;
}

/** Default 2FA configuration */
export const DEFAULT_TWOFA_CONFIG: TwoFAConfig = {
  enabled: false,
  requiredForSubmissions: true,
  methods: {
    sms: { enabled: false },
    email: { enabled: false },
    totp: { enabled: false, totpVerified: false },
    backup_code: { enabled: true },
  },
  backupCodes: [],
  updatedAt: 0,
};