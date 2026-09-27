/**
 * Form CAPTCHA configuration.
 */

import type { CaptchaConfig } from "./types";

export const STORAGE_KEY_CONSENT = "dongle:form-captcha:consent";

export const DEFAULT_CONFIG: CaptchaConfig = {
  enabled: true,
  siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "",
  challengeThreshold: 0.5,
  minScore: 0.3,
  defaultAction: "form_submit",
  allowAccessibleFallback: true,
  respectPrivacySignals: true,
};

export function createConfig(overrides: Partial<CaptchaConfig> = {}): CaptchaConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

export function isCaptchaConfigured(config: CaptchaConfig = DEFAULT_CONFIG): boolean {
  return Boolean(config.siteKey && config.siteKey.length > 0);
}
