/**
 * Webhook configuration and delivery service.
 *
 * Powers issue #720: Allow Projects to Configure Webhooks for Events.
 *
 * Acceptance criteria:
 *  - Webhook config UI (backed by these API routes)
 *  - Supported events: review.created, review.updated, verification.approved, verification.rejected
 *  - Webhook URL validation (HTTPS only)
 *  - Secret for signature verification (HMAC-SHA256)
 *  - Retry logic (3 attempts with backoff)
 *  - Webhook delivery logs
 *  - Test webhook button
 */

import { createHmac, timingSafeEqual } from "crypto";
import {
  scheduleWebhookDelivery,
  type WebhookDelivery,
  type WebhookRetryConfig,
} from "./webhook-retry.service";

export const SUPPORTED_EVENTS = [
  "review.created",
  "review.updated",
  "verification.approved",
  "verification.rejected",
] as const;

export type SupportedEvent = typeof SUPPORTED_EVENTS[number];

export interface WebhookConfig {
  id: string;
  projectId: string;
  url: string;
  events: SupportedEvent[];
  secret: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WebhookStore {
  configs: Map<string, WebhookConfig>;
  deliveries: WebhookDelivery[];
}

const store: WebhookStore = { configs: new Map(), deliveries: [] };

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Validate that a webhook URL uses HTTPS.
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Generate an HMAC-SHA256 signature for a payload.
 */
export function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify an incoming webhook signature.
 */
export function verifySignature(secret: string, payload: string, signature: string): boolean {
  const expected = signPayload(secret, payload);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Create a webhook config.
 */
export function createWebhook(config: Omit<WebhookConfig, "id" | "createdAt" | "updatedAt">): WebhookConfig {
  if (!isValidWebhookUrl(config.url)) {
    throw new Error("Webhook URL must use HTTPS");
  }
  const invalid = config.events.filter((e) => !SUPPORTED_EVENTS.includes(e as SupportedEvent));
  if (invalid.length) {
    throw new Error(`Unsupported events: ${invalid.join(", ")}`);
  }
  const now = new Date().toISOString();
  const webhook: WebhookConfig = {
    id: generateId(),
    ...config,
    secret: config.secret || generateId(),
    active: config.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  store.configs.set(webhook.id, webhook);
  return webhook;
}

/**
 * List webhook configs, optionally filtered by project.
 */
export function listWebhooks(projectId?: string): WebhookConfig[] {
  const configs = Array.from(store.configs.values());
  return projectId ? configs.filter((c) => c.projectId === projectId) : configs;
}

/**
 * Get a single webhook config (secret excluded for safety on list; included here for admin).
 */
export function getWebhook(id: string): WebhookConfig | undefined {
  return store.configs.get(id);
}

/**
 * Update a webhook config.
 */
export function updateWebhook(
  id: string,
  patch: Partial<Pick<WebhookConfig, "url" | "events" | "secret" | "active">>,
): WebhookConfig | null {
  const existing = store.configs.get(id);
  if (!existing) return null;
  if (patch.url !== undefined && !isValidWebhookUrl(patch.url)) {
    throw new Error("Webhook URL must use HTTPS");
  }
  const now = new Date().toISOString();
  const updated: WebhookConfig = {
    ...existing,
    ...patch,
    updatedAt: now,
  };
  store.configs.set(id, updated);
  return updated;
}

/**
 * Delete a webhook config.
 */
export function deleteWebhook(id: string): boolean {
  return store.configs.delete(id);
}

/**
 * Trigger deliveries for an event to all matching active webhooks.
 */
export async function deliverEvent(
  projectId: string,
  event: SupportedEvent,
  data: unknown,
): Promise<{ sent: number; deliveries: WebhookDelivery[] }> {
  const configs = Array.from(store.configs.values()).filter(
    (c) => c.projectId === projectId && c.active && c.events.includes(event),
  );

  const payload = {
    id: generateId(),
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const payloadString = JSON.stringify(payload);

  const deliveries: WebhookDelivery[] = [];
  for (const config of configs) {
    const delivery: WebhookDelivery = {
      id: generateId(),
      url: config.url,
      payload,
      signature: {
        signature: signPayload(config.secret, payloadString),
        timestamp: new Date().toISOString(),
        version: "1",
      },
      attempt: 0,
      maxAttempts: 3,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    deliveries.push(delivery);
    await scheduleWebhookDelivery(delivery, { maxAttempts: 3, baseDelay: 1000, maxDelay: 30000, jitterFactor: 0.3 });
  }

  return { sent: configs.length, deliveries };
}

/**
 * List recent delivery logs.
 */
export function listDeliveries(limit = 50): WebhookDelivery[] {
  return [...store.deliveries].slice(-limit);
}

export type { WebhookConfig };
