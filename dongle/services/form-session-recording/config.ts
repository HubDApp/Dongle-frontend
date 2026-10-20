/**
 * Form session recording configuration.
 */

import type { SessionRecordingConfig } from "./types";

export const STORAGE_KEY = "dongle:form-session-recordings:v1";
export const CONSENT_KEY = "dongle:form-session-recording:consent";

export const DEFAULT_CONFIG: SessionRecordingConfig = {
  enabled: true,
  requireConsent: true,
  maxEvents: 1000,
  maxStoredSessions: 10,
  sensitiveFieldPatterns: [
    "password",
    "passphrase",
    "secret",
    "seed",
    "mnemonic",
    "private",
    "token",
    "otp",
    "pin",
    "cvv",
    "ssn",
    "card",
  ],
  persistLocally: true,
};

export function createConfig(
  overrides: Partial<SessionRecordingConfig> = {},
): SessionRecordingConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    sensitiveFieldPatterns:
      overrides.sensitiveFieldPatterns ?? DEFAULT_CONFIG.sensitiveFieldPatterns,
  };
}
