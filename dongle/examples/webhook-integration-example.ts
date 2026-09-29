/**
 * Example: Webhook Integration with Signature Verification
 */

import {
  generateSignature,
  verifySignatureFromHeaders,
  createSignatureHeaders,
} from '@/lib/webhook-signature';

// Example 1: Sending a Signed Webhook
async function sendWebhookWithSignature() {
  const payload = {
    event: 'form.submitted',
    timestamp: new Date().toISOString(),
    data: {
      formId: 'form-123',
      userId: 'user-456',
      projectName: 'DeFi Protocol',
    },
    id: crypto.randomUUID(),
  };

  const webhookUrl = 'https://example.com/webhook';
  const secret = process.env.WEBHOOK_SECRET || 'your-webhook-secret';

  // Create headers with signature
  const headers = createSignatureHeaders(payload, secret);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('✓ Webhook delivered successfully');
    } else {
      console.error('✗ Webhook delivery failed:', response.status);
    }
  } catch (error) {
    console.error('✗ Webhook delivery error:', error);
  }
}

// Example 2: Receiving and Verifying Webhooks (Next.js API Route)
// File: app/api/webhook/receiver/route.ts
/*
import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureFromHeaders } from '@/lib/webhook-signature';

export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET!;
  
  // Get raw body as string
  const body = await request.text();
  
  // Extract headers
  const headers = Object.fromEntries(request.headers.entries());
  
  // Verify signature
  const verification = verifySignatureFromHeaders(body, headers, secret);
  
  if (!verification.valid) {
    console.error('Webhook verification failed:', verification.error);
    return NextResponse.json(
      { error: 'Invalid signature', reason: verification.error },
      { status: 401 }
    );
  }
  
  // Parse payload
  const payload = JSON.parse(body);
  
  // Log webhook ID for idempotency
  console.log('Webhook received:', payload.id);
  
  // Process webhook based on event type
  switch (payload.event) {
    case 'form.submitted':
      await handleFormSubmission(payload.data);
      break;
    case 'review.created':
      await handleReviewCreation(payload.data);
      break;
    default:
      console.warn('Unknown event type:', payload.event);
  }
  
  return NextResponse.json({ received: true });
}
*/

// Example 3: Express.js Webhook Receiver
/*
import express from 'express';
import { verifySignatureFromHeaders } from '@/lib/webhook-signature';

const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET!;
  const body = req.body.toString('utf8');
  const headers = req.headers;
  
  // Verify signature
  const verification = verifySignatureFromHeaders(body, headers, secret);
  
  if (!verification.valid) {
    return res.status(401).json({
      error: 'Invalid signature',
      reason: verification.error
    });
  }
  
  // Process webhook
  const payload = JSON.parse(body);
  console.log('Webhook received:', payload.event);
  
  // Respond quickly
  res.status(200).json({ received: true });
  
  // Process asynchronously
  processWebhookAsync(payload);
});
*/

// Example 4: Using the Smart Retry System
async function sendWebhookWithRetry() {
  const request = {
    url: 'https://example.com/webhook',
    event: 'form.submitted',
    data: {
      formId: 'form-123',
      userId: 'user-456',
      projectName: 'DeFi Protocol',
    },
    maxAttempts: 5, // Override default
  };

  try {
    const response = await fetch('/api/webhooks/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✓ Webhook scheduled:', result.data.deliveryId);
      console.log('  Webhook ID:', result.data.webhookId);
      console.log('  Status:', result.data.status);
    } else {
      console.error('✗ Failed to schedule webhook:', result.error.message);
    }

    return result;
  } catch (error) {
    console.error('✗ Request failed:', error);
  }
}

// Example 5: Monitor Webhook Status
async function monitorWebhookStatus(deliveryId: string) {
  try {
    const response = await fetch(`/api/webhooks/status?deliveryId=${deliveryId}`);
    const result = await response.json();

    if (result.success) {
      const delivery = result.data;
      console.log('Delivery Status:', delivery.status);
      console.log('Attempts:', `${delivery.attempt}/${delivery.maxAttempts}`);

      if (delivery.nextRetryAt) {
        console.log('Next retry at:', delivery.nextRetryAt);
      }

      if (delivery.error) {
        console.error('Last error:', delivery.error);
      }
    }
  } catch (error) {
    console.error('Failed to fetch status:', error);
  }
}

// Example 6: Webhook Dashboard Component
/*
'use client';

import { useEffect, useState } from 'react';

export function WebhookMonitor() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch('/api/webhooks/status');
      const data = await response.json();
      setStats(data.data);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Pending"
          value={stats.statistics.pendingCount}
        />
        <MetricCard
          label="Dead Letter"
          value={stats.statistics.deadLetterCount}
          variant="warning"
        />
        <MetricCard
          label="Total Retries"
          value={stats.statistics.totalRetries}
        />
        <MetricCard
          label="Avg Attempts"
          value={stats.statistics.averageAttempts.toFixed(1)}
        />
      </div>

      <div>
        <h3 className="font-semibold mb-2">Pending Deliveries</h3>
        {stats.pending.map((delivery: any) => (
          <div key={delivery.id} className="border p-2 mb-2">
            <div className="text-sm">
              <div>URL: {delivery.url}</div>
              <div>Attempt: {delivery.attempt}/{delivery.maxAttempts}</div>
              <div>Next retry: {new Date(delivery.nextRetryAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
*/

// Example 7: Retry from Dead Letter Queue
async function retryFailedWebhook(deliveryId: string) {
  try {
    const response = await fetch('/api/webhooks/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deliveryId,
        action: 'retry',
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✓ Webhook moved back to queue for retry');
    } else {
      console.error('✗ Failed to retry:', result.error.message);
    }
  } catch (error) {
    console.error('✗ Request failed:', error);
  }
}

// Example 8: Idempotent Webhook Handler
const processedWebhooks = new Set<string>();

async function handleWebhookIdempotent(webhookId: string, payload: any) {
  // Check if already processed
  if (processedWebhooks.has(webhookId)) {
    console.log('Webhook already processed:', webhookId);
    return { alreadyProcessed: true };
  }

  try {
    // Process webhook
    await processWebhook(payload);

    // Mark as processed
    processedWebhooks.add(webhookId);

    // Clean up old entries (keep last 10000)
    if (processedWebhooks.size > 10000) {
      const iterator = processedWebhooks.values();
      processedWebhooks.delete(iterator.next().value);
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook processing failed:', error);
    throw error;
  }
}

async function processWebhook(payload: any) {
  // Implement your webhook processing logic
  console.log('Processing webhook:', payload.event);
}

export {
  sendWebhookWithSignature,
  sendWebhookWithRetry,
  monitorWebhookStatus,
  retryFailedWebhook,
  handleWebhookIdempotent,
};
