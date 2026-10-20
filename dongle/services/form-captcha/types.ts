/**
 * Form CAPTCHA protection types — reCAPTCHA v3 + optional challenge.
 */

export type CaptchaMode = "v3" | "challenge" | "accessible";

export interface CaptchaTokenResult {
  success: boolean;
  token: string | null;
  score: number | null;
  mode: CaptchaMode;
  action: string;
  error?: string;
}

export interface CaptchaValidationResult {
  valid: boolean;
  score: number | null;
  mode: CaptchaMode;
  requiresChallenge: boolean;
  message: string;
}

export interface CaptchaConfig {
  enabled: boolean;
  /** Site key for reCAPTCHA v3 (public). Empty = mock/dev mode. */
  siteKey: string;
  /** Score below which challenge mode is suggested (0–1). */
  challengeThreshold: number;
  /** Minimum score to accept a v3 token (server should re-verify). */
  minScore: number;
  /** Default action name sent with execute(). */
  defaultAction: string;
  /** Allow honeypot / math accessible alternative when scripts blocked. */
  allowAccessibleFallback: boolean;
  /** Respect Do-Not-Track / reduced data by preferring accessible mode. */
  respectPrivacySignals: boolean;
}

export interface AccessibleChallenge {
  question: string;
  /** Expected answer as string (never send to client in production verify). */
  answerHash: string;
  challengeId: string;
}
