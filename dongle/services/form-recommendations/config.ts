/**
 * Form Recommendation Configuration
 * Defaults for local value learning, ranking and retention.
 */

import type { RecommendationConfig } from "./types";

/** localStorage key holding the on-device profile. */
export const STORAGE_KEY = "dongle:form-recommendations:v1";

/** Bumped whenever the persisted shape changes; older profiles are discarded. */
export const PROFILE_VERSION = 1;

export const DEFAULT_CONFIG: RecommendationConfig = {
  enabled: true,

  maxSuggestionsPerField: 3,
  maxValuesPerField: 10,

  // Ninety days. Long enough to span occasional submissions, short enough that
  // a stale value does not follow the user around indefinitely.
  valueTtlMs: 90 * 24 * 60 * 60 * 1000,

  minScoreToSuggest: 0.15,
  minValueLength: 2,
  maxValueLength: 120,

  // Weights are normalised by their sum, so these are relative, not absolute.
  frequencyWeight: 0.4,
  recencyWeight: 0.3,
  feedbackWeight: 0.3,

  // Fourteen days: a value used two weeks ago scores half the recency of one
  // used today.
  recencyHalfLifeMs: 14 * 24 * 60 * 60 * 1000,

  rejectionSuppressionMargin: 2,
};

/**
 * Field names that are never learned, matched case-insensitively as substrings.
 *
 * The engine stores raw values on the device, so anything that could be a
 * secret, a credential, or a direct personal identifier is excluded outright
 * rather than being stored and filtered later.
 */
export const SENSITIVE_FIELD_PATTERNS: readonly string[] = [
  "password",
  "passphrase",
  "secret",
  "seed",
  "mnemonic",
  "privatekey",
  "private_key",
  "token",
  "apikey",
  "api_key",
  "otp",
  "pin",
  "cvv",
  "cardnumber",
  "card_number",
  "ssn",
  "taxid",
  "tax_id",
  "signature",
  "email",
  "phone",
  "dob",
  "birth",
];

/**
 * Value shapes that are never learned even when the field name looks benign.
 *
 * Catches a secret pasted into a generically named field.
 */
export const SENSITIVE_VALUE_PATTERNS: readonly RegExp[] = [
  // Email address
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Stellar secret seed
  /^S[A-Z2-7]{55}$/,
  // Long hex blob, e.g. a key or signature
  /^(0x)?[0-9a-f]{32,}$/i,
  // Anything that reads like a bearer/JWT token
  /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./,
];

/** Returns true when the field must never be learned from. */
export function isSensitiveField(fieldName: string): boolean {
  const normalised = fieldName.toLowerCase().replace(/[\s-]/g, "");
  return SENSITIVE_FIELD_PATTERNS.some((pattern) =>
    normalised.includes(pattern.replace(/[\s_-]/g, "")),
  );
}

/** Returns true when the value itself looks sensitive regardless of field name. */
export function isSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

/** Merge partial overrides over the defaults. */
export function createConfig(
  overrides: Partial<RecommendationConfig> = {},
): RecommendationConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
