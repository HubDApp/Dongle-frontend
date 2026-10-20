/**
 * Types for webhook system
 */

export interface WebhookPayload<T = unknown> {
  event: string;
  timestamp: string;
  data: T;
  id: string;
}

export interface WebhookSignature {
  signature: string;
  timestamp: string;
  version: string;
}

export interface WebhookDelivery {
  id: string;
  url: string;
  payload: WebhookPayload;
  signature: WebhookSignature;
  attempt: number;
  maxAttempts: number;
  status: "pending" | "success" | "failed" | "dead_letter";
  error?: string;
  createdAt: string;
  nextRetryAt?: string;
  deliveredAt?: string;
}

export interface WebhookRetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  jitterFactor: number; // 0-1
}

export interface DeadLetterQueueItem {
  delivery: WebhookDelivery;
  failedAt: string;
  reason: string;
}
