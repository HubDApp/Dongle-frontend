/**
 * Smart webhook retry logic with exponential backoff, jitter, and dead letter queue
 */

import type {
  WebhookDelivery,
  WebhookRetryConfig,
  DeadLetterQueueItem,
} from "@/types/webhook";

const DEFAULT_RETRY_CONFIG: WebhookRetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 300000, // 5 minutes
  jitterFactor: 0.3, // 30% jitter
};

// In-memory stores (replace with database in production)
const deliveryQueue = new Map<string, WebhookDelivery>();
const deadLetterQueue: DeadLetterQueueItem[] = [];
const retryTimers = new Map<string, NodeJS.Timeout>();

/**
 * Calculate next retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  config: WebhookRetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * (Math.random() * 2 - 1);
  const finalDelay = Math.max(0, cappedDelay + jitter);
  
  return Math.round(finalDelay);
}

/**
 * Schedule a webhook delivery with retry logic
 */
export async function scheduleWebhookDelivery(
  delivery: WebhookDelivery,
  config: WebhookRetryConfig = DEFAULT_RETRY_CONFIG
): Promise<void> {
  deliveryQueue.set(delivery.id, delivery);

  // Attempt delivery
  await attemptDelivery(delivery, config);
}

/**
 * Attempt webhook delivery
 */
async function attemptDelivery(
  delivery: WebhookDelivery,
  config: WebhookRetryConfig
): Promise<void> {
  try {
    // Simulate webhook HTTP request (replace with actual HTTP client in production)
    const response = await fetch(delivery.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": delivery.signature.signature,
        "X-Webhook-Timestamp": delivery.signature.timestamp,
        "X-Webhook-ID": delivery.id,
        "X-Webhook-Attempt": delivery.attempt.toString(),
      },
      body: JSON.stringify(delivery.payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (response.ok) {
      // Success
      delivery.status = "success";
      delivery.deliveredAt = new Date().toISOString();
      deliveryQueue.delete(delivery.id);
      console.log(`[Webhook] Delivered successfully: ${delivery.id}`);
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Webhook] Delivery attempt ${delivery.attempt} failed:`, errorMessage);

    delivery.error = errorMessage;
    delivery.attempt++;

    if (delivery.attempt >= config.maxAttempts) {
      // Move to dead letter queue
      moveToDeadLetterQueue(delivery, errorMessage);
    } else {
      // Schedule retry
      scheduleRetry(delivery, config);
    }
  }
}

/**
 * Schedule retry with exponential backoff
 */
function scheduleRetry(
  delivery: WebhookDelivery,
  config: WebhookRetryConfig
): void {
  const delay = calculateRetryDelay(delivery.attempt, config);
  const nextRetryAt = new Date(Date.now() + delay);
  
  delivery.nextRetryAt = nextRetryAt.toISOString();
  delivery.status = "pending";

  console.log(
    `[Webhook] Scheduling retry ${delivery.attempt}/${config.maxAttempts} for ${delivery.id} in ${delay}ms`
  );

  // Clear existing timer if any
  const existingTimer = retryTimers.get(delivery.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule retry
  const timer = setTimeout(() => {
    retryTimers.delete(delivery.id);
    attemptDelivery(delivery, config);
  }, delay);

  retryTimers.set(delivery.id, timer);
}

/**
 * Move failed delivery to dead letter queue
 */
function moveToDeadLetterQueue(
  delivery: WebhookDelivery,
  reason: string
): void {
  delivery.status = "dead_letter";
  
  const dlqItem: DeadLetterQueueItem = {
    delivery,
    failedAt: new Date().toISOString(),
    reason,
  };

  deadLetterQueue.push(dlqItem);
  deliveryQueue.delete(delivery.id);

  console.error(
    `[Webhook] Moved to dead letter queue: ${delivery.id} - ${reason}`
  );
}

/**
 * Get delivery status
 */
export function getDeliveryStatus(deliveryId: string): WebhookDelivery | undefined {
  return deliveryQueue.get(deliveryId);
}

/**
 * Get all pending deliveries
 */
export function getPendingDeliveries(): WebhookDelivery[] {
  return Array.from(deliveryQueue.values()).filter(
    (d) => d.status === "pending"
  );
}

/**
 * Get dead letter queue items
 */
export function getDeadLetterQueue(): DeadLetterQueueItem[] {
  return [...deadLetterQueue];
}

/**
 * Retry delivery from dead letter queue
 */
export async function retryFromDeadLetterQueue(
  deliveryId: string,
  config: WebhookRetryConfig = DEFAULT_RETRY_CONFIG
): Promise<boolean> {
  const index = deadLetterQueue.findIndex((item) => item.delivery.id === deliveryId);
  
  if (index === -1) {
    return false;
  }

  const item = deadLetterQueue[index];
  deadLetterQueue.splice(index, 1);

  // Reset delivery status
  item.delivery.attempt = 0;
  item.delivery.status = "pending";
  item.delivery.error = undefined;
  item.delivery.nextRetryAt = undefined;

  await scheduleWebhookDelivery(item.delivery, config);
  return true;
}

/**
 * Get retry statistics
 */
export function getRetryStatistics() {
  const pending = getPendingDeliveries();
  const dlq = getDeadLetterQueue();

  return {
    pendingCount: pending.length,
    deadLetterCount: dlq.length,
    totalRetries: pending.reduce((sum, d) => sum + d.attempt, 0),
    averageAttempts:
      pending.length > 0
        ? pending.reduce((sum, d) => sum + d.attempt, 0) / pending.length
        : 0,
  };
}

export { DEFAULT_RETRY_CONFIG };
