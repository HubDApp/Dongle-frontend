/**
 * Form webhook configuration
 */

import type { FormWebhookConfig, FormWebhookEndpoint } from "./types";

export const DEFAULT_WEBHOOK_CONFIG: FormWebhookConfig = {
  enabled: true,
  endpoints: [],
  maxRetries: 3,
  retryBaseDelayMs: 250,
  timeoutMs: 8_000,
  signatureHeader: "X-Dongle-Signature",
  deliveryIdHeader: "X-Dongle-Delivery-Id",
};

export function createWebhookConfig(
  overrides: Partial<FormWebhookConfig> = {},
): FormWebhookConfig {
  return {
    ...DEFAULT_WEBHOOK_CONFIG,
    ...overrides,
    endpoints: overrides.endpoints ?? DEFAULT_WEBHOOK_CONFIG.endpoints,
  };
}

/**
 * Load webhook endpoints from env.
 * FORM_WEBHOOK_URL + FORM_WEBHOOK_SECRET define a single default endpoint.
 * FORM_WEBHOOK_ENDPOINTS can be a JSON array of { id, url, secret, enabled? }.
 */
export function loadWebhookEndpointsFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): FormWebhookEndpoint[] {
  const endpoints: FormWebhookEndpoint[] = [];

  if (env.FORM_WEBHOOK_URL) {
    endpoints.push({
      id: "default",
      url: env.FORM_WEBHOOK_URL,
      secret: env.FORM_WEBHOOK_SECRET || "dongle-dev-webhook-secret",
      enabled: true,
      description: "Default form submission webhook",
    });
  }

  if (env.FORM_WEBHOOK_ENDPOINTS) {
    try {
      const parsed = JSON.parse(env.FORM_WEBHOOK_ENDPOINTS) as Array<Partial<FormWebhookEndpoint>>;
      for (const item of parsed) {
        if (!item.url || !item.secret) continue;
        endpoints.push({
          id: item.id || `endpoint_${endpoints.length + 1}`,
          url: item.url,
          secret: item.secret,
          enabled: item.enabled !== false,
          description: item.description,
        });
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return endpoints;
}
