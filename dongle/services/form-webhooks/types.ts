/**
 * Form submission webhook types
 */

export type WebhookDeliveryStatus = "pending" | "success" | "failed" | "skipped";

export interface FormWebhookPayload {
  event: "form.submitted";
  formType: string;
  submissionId: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface FormWebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  enabled: boolean;
  description?: string;
}

export interface FormWebhookConfig {
  enabled: boolean;
  endpoints: FormWebhookEndpoint[];
  maxRetries: number;
  /** Base delay in ms for exponential backoff */
  retryBaseDelayMs: number;
  /** Request timeout in ms */
  timeoutMs: number;
  /** Header name for HMAC signature */
  signatureHeader: string;
  /** Header name for delivery id */
  deliveryIdHeader: string;
}

export interface WebhookAttemptResult {
  attempt: number;
  statusCode?: number;
  ok: boolean;
  error?: string;
  durationMs: number;
}

export interface WebhookDeliveryResult {
  endpointId: string;
  url: string;
  status: WebhookDeliveryStatus;
  deliveryId: string;
  signature: string;
  attempts: WebhookAttemptResult[];
  error?: string;
}

export interface WebhookDispatchResult {
  status: WebhookDeliveryStatus;
  deliveries: WebhookDeliveryResult[];
}
