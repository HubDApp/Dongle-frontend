/**
 * Email confirmation configuration
 */

import type { FormEmailConfirmationConfig } from "./types";

export const DEFAULT_EMAIL_CONFIG: FormEmailConfirmationConfig = {
  enabled: true,
  fromAddress: "noreply@dongle.app",
  fromName: "Dongle",
  appBaseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://dongle.app",
  provider: (process.env.FORM_EMAIL_PROVIDER as FormEmailConfirmationConfig["provider"]) || "console",
  providerWebhookUrl: process.env.FORM_EMAIL_WEBHOOK_URL,
  resendApiKey: process.env.RESEND_API_KEY,
  requireConfirmationLink: true,
};

export function createEmailConfig(
  overrides: Partial<FormEmailConfirmationConfig> = {},
): FormEmailConfirmationConfig {
  return {
    ...DEFAULT_EMAIL_CONFIG,
    ...overrides,
  };
}

export function buildConfirmationUrl(
  config: FormEmailConfirmationConfig,
  submissionId: string,
  formType: string,
): string {
  const base = config.appBaseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    submissionId,
    formType,
  });
  return `${base}/submissions/confirm?${params.toString()}`;
}
