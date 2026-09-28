/**
 * Form webhook dispatcher with retries and HMAC signing
 */

import {
  createWebhookConfig,
  DEFAULT_WEBHOOK_CONFIG,
  loadWebhookEndpointsFromEnv,
} from "./config";
import { signWebhookPayload, verifyWebhookSignature } from "./signature";
import type {
  FormWebhookConfig,
  FormWebhookEndpoint,
  FormWebhookPayload,
  WebhookAttemptResult,
  WebhookDeliveryResult,
  WebhookDispatchResult,
} from "./types";

function createDeliveryId(): string {
  return `del_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postOnce(
  url: string,
  rawBody: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<WebhookAttemptResult & { attempt: number }> {
  const started = Date.now();
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: rawBody,
      signal: controller?.signal,
    });
    return {
      attempt: 0,
      statusCode: response.status,
      ok: response.ok,
      durationMs: Date.now() - started,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      attempt: 0,
      ok: false,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Webhook request failed",
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function deliverToEndpoint(
  endpoint: FormWebhookEndpoint,
  payload: FormWebhookPayload,
  config: FormWebhookConfig,
): Promise<WebhookDeliveryResult> {
  const deliveryId = createDeliveryId();
  const rawBody = JSON.stringify(payload);
  const signature = await signWebhookPayload(endpoint.secret, rawBody);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Dongle-FormWebhooks/1.0",
    [config.signatureHeader]: signature,
    [config.deliveryIdHeader]: deliveryId,
    "X-Dongle-Event": payload.event,
  };

  const attempts: WebhookAttemptResult[] = [];
  const maxAttempts = Math.max(1, config.maxRetries);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) {
      const delay = config.retryBaseDelayMs * 2 ** (attempt - 2);
      await sleep(delay);
    }

    const result = await postOnce(endpoint.url, rawBody, headers, config.timeoutMs);
    attempts.push({ ...result, attempt });

    if (result.ok) {
      return {
        endpointId: endpoint.id,
        url: endpoint.url,
        status: "success",
        deliveryId,
        signature,
        attempts,
      };
    }
  }

  return {
    endpointId: endpoint.id,
    url: endpoint.url,
    status: "failed",
    deliveryId,
    signature,
    attempts,
    error: attempts[attempts.length - 1]?.error || "All webhook attempts failed",
  };
}

/**
 * Dispatch form submission data to all configured webhook endpoints.
 */
export async function dispatchFormWebhooks(
  payload: FormWebhookPayload,
  overrides: Partial<FormWebhookConfig> = {},
): Promise<WebhookDispatchResult> {
  const envEndpoints = loadWebhookEndpointsFromEnv();
  const config = createWebhookConfig({
    ...overrides,
    endpoints: overrides.endpoints ?? envEndpoints,
  });

  if (!config.enabled) {
    return { status: "skipped", deliveries: [] };
  }

  const active = config.endpoints.filter((endpoint) => endpoint.enabled && endpoint.url);
  if (active.length === 0) {
    return { status: "skipped", deliveries: [] };
  }

  const deliveries = await Promise.all(
    active.map((endpoint) => deliverToEndpoint(endpoint, payload, config)),
  );

  const anySuccess = deliveries.some((d) => d.status === "success");
  const allFailed = deliveries.every((d) => d.status === "failed");

  return {
    status: allFailed ? "failed" : anySuccess ? "success" : "pending",
    deliveries,
  };
}

/**
 * Build a standard form.submitted webhook payload.
 */
export function buildFormWebhookPayload(input: {
  formType: string;
  submissionId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, string>;
}): FormWebhookPayload {
  return {
    event: "form.submitted",
    formType: input.formType,
    submissionId: input.submissionId,
    timestamp: new Date().toISOString(),
    data: input.data,
    metadata: input.metadata,
  };
}

/**
 * Send a test webhook payload to a single URL (or configured default).
 */
export async function sendTestWebhook(input: {
  url?: string;
  secret?: string;
  formType?: string;
}): Promise<WebhookDispatchResult> {
  const envEndpoints = loadWebhookEndpointsFromEnv();
  const endpoint: FormWebhookEndpoint = {
    id: "test",
    url: input.url || envEndpoints[0]?.url || "",
    secret: input.secret || envEndpoints[0]?.secret || "dongle-dev-webhook-secret",
    enabled: true,
    description: "Test webhook",
  };

  if (!endpoint.url) {
    return {
      status: "failed",
      deliveries: [
        {
          endpointId: "test",
          url: "",
          status: "failed",
          deliveryId: createDeliveryId(),
          signature: "",
          attempts: [],
          error: "No webhook URL configured. Pass url or set FORM_WEBHOOK_URL.",
        },
      ],
    };
  }

  const payload = buildFormWebhookPayload({
    formType: input.formType || "webhook-test",
    submissionId: `test_${Date.now()}`,
    data: {
      message: "Dongle form webhook test",
      ok: true,
    },
    metadata: { source: "test-endpoint" },
  });

  return dispatchFormWebhooks(payload, {
    endpoints: [endpoint],
    maxRetries: 1,
  });
}

export {
  DEFAULT_WEBHOOK_CONFIG,
  createWebhookConfig,
  loadWebhookEndpointsFromEnv,
  signWebhookPayload,
  verifyWebhookSignature,
};
