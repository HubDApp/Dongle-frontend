# Webhook Retry Logic

## Overview

The webhook system implements smart retry logic with exponential backoff, jitter, dead letter queue, and comprehensive monitoring.

## Features

- ✅ **Exponential Backoff**: Delays increase exponentially between retries
- ✅ **Jitter**: Random variance prevents thundering herd
- ✅ **Configurable Max Attempts**: Default 5, configurable up to 10
- ✅ **Dead Letter Queue**: Failed deliveries preserved for manual intervention
- ✅ **Monitoring Dashboard**: Real-time status and statistics
- ✅ **Manual Retry**: Resurrect failed webhooks from DLQ

## Retry Strategy

### Default Configuration

```typescript
{
  maxAttempts: 5,
  baseDelay: 1000,        // 1 second
  maxDelay: 300000,       // 5 minutes
  jitterFactor: 0.3       // 30% jitter
}
```

### Retry Schedule

| Attempt | Base Delay | With Jitter (±30%) | Cumulative Time |
|---------|------------|-------------------|-----------------|
| 1       | 1s         | 0.7s - 1.3s       | 1s              |
| 2       | 2s         | 1.4s - 2.6s       | 3s              |
| 3       | 4s         | 2.8s - 5.2s       | 7s              |
| 4       | 8s         | 5.6s - 10.4s      | 15s             |
| 5       | 16s        | 11.2s - 20.8s     | 31s             |

After 5 failed attempts, the delivery moves to the dead letter queue.

## Sending Webhooks

### Basic Usage

```typescript
const response = await fetch('/api/webhooks/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/webhook',
    event: 'form.submitted',
    data: {
      formId: 'form-123',
      userId: 'user-456',
      timestamp: new Date().toISOString()
    }
  })
});

const result = await response.json();
console.log('Delivery ID:', result.data.deliveryId);
```

### Custom Retry Configuration

```typescript
await fetch('/api/webhooks/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/webhook',
    event: 'form.submitted',
    data: { formId: 'form-123' },
    maxAttempts: 8  // Override default (max: 10)
  })
});
```

## Monitoring Dashboard

### Get Overall Statistics

```typescript
const response = await fetch('/api/webhooks/status');
const data = await response.json();

console.log('Statistics:', data.data.statistics);
// {
//   pendingCount: 5,
//   deadLetterCount: 2,
//   totalRetries: 15,
//   averageAttempts: 3
// }
```

### Get Specific Delivery Status

```typescript
const deliveryId = '550e8400-e29b-41d4-a716-446655440000';
const response = await fetch(`/api/webhooks/status?deliveryId=${deliveryId}`);
const data = await response.json();

console.log('Delivery:', data.data);
// {
//   id: '550e8400-...',
//   url: 'https://example.com/webhook',
//   status: 'pending',
//   attempt: 2,
//   maxAttempts: 5,
//   nextRetryAt: '2024-01-15T10:35:00Z'
// }
```

### Monitor Pending Deliveries

```typescript
const response = await fetch('/api/webhooks/status');
const { pending } = await response.json();

pending.forEach(delivery => {
  console.log(`${delivery.id}: Attempt ${delivery.attempt}/${delivery.maxAttempts}`);
  console.log(`Next retry: ${delivery.nextRetryAt}`);
});
```

### Check Dead Letter Queue

```typescript
const response = await fetch('/api/webhooks/status');
const { deadLetterQueue } = await response.json();

deadLetterQueue.forEach(item => {
  console.log(`Failed: ${item.url}`);
  console.log(`Reason: ${item.reason}`);
  console.log(`Failed at: ${item.failedAt}`);
  console.log(`Total attempts: ${item.attempts}`);
});
```

## Dead Letter Queue

### Retry Failed Delivery

```typescript
const deliveryId = '550e8400-e29b-41d4-a716-446655440000';

const response = await fetch('/api/webhooks/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deliveryId,
    action: 'retry'
  })
});

if (response.ok) {
  console.log('Delivery moved back to queue for retry');
}
```

## Dashboard UI Component

```typescript
'use client';

import { useEffect, useState } from 'react';

export function WebhookDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch('/api/webhooks/status');
      const data = await response.json();
      setStats(data.data);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Webhook Dashboard</h2>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="Pending" 
          value={stats.statistics.pendingCount}
          color="blue"
        />
        <StatCard 
          label="Dead Letter" 
          value={stats.statistics.deadLetterCount}
          color="red"
        />
        <StatCard 
          label="Total Retries" 
          value={stats.statistics.totalRetries}
          color="yellow"
        />
        <StatCard 
          label="Avg Attempts" 
          value={stats.statistics.averageAttempts.toFixed(1)}
          color="green"
        />
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Pending Deliveries</h3>
        <PendingList items={stats.pending} />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Dead Letter Queue</h3>
        <DeadLetterList items={stats.deadLetterQueue} />
      </div>
    </div>
  );
}
```

## Error Handling

### Retry Triggers

Webhooks are retried on:
- HTTP 5xx errors
- Network timeouts (30 second limit)
- Connection errors
- DNS resolution failures

### No Retry

Webhooks are NOT retried on:
- HTTP 4xx errors (except 429 Rate Limit)
- Invalid URLs
- Signature verification failures

## Best Practices

### 1. Implement Idempotency

Your webhook receiver should be idempotent:

```typescript
const processedWebhooks = new Set<string>();

app.post('/webhook', (req, res) => {
  const webhookId = req.headers['x-webhook-id'];
  
  if (processedWebhooks.has(webhookId)) {
    // Already processed, return success
    return res.json({ received: true });
  }
  
  // Process webhook...
  processedWebhooks.add(webhookId);
  
  res.json({ received: true });
});
```

### 2. Return 2xx Quickly

Respond with success status before processing:

```typescript
app.post('/webhook', async (req, res) => {
  // Verify signature...
  
  // Respond immediately
  res.status(200).json({ received: true });
  
  // Process asynchronously
  processWebhookAsync(req.body);
});
```

### 3. Monitor Dead Letter Queue

Set up alerts for DLQ items:

```typescript
const checkDLQ = async () => {
  const response = await fetch('/api/webhooks/status');
  const { deadLetterQueue } = await response.json();
  
  if (deadLetterQueue.length > 10) {
    await sendAlert('High number of failed webhooks!');
  }
};

setInterval(checkDLQ, 60000); // Check every minute
```

### 4. Log Retry Events

```typescript
app.post('/webhook', (req, res) => {
  const attempt = req.headers['x-webhook-attempt'];
  
  if (parseInt(attempt) > 1) {
    console.log(`Retry attempt ${attempt} received`);
  }
  
  // Process...
});
```

## Performance Considerations

- **Concurrent Deliveries**: System processes multiple webhooks in parallel
- **Timeout**: 30 second limit per delivery attempt
- **Memory**: In-memory queue suitable for moderate volumes
- **Production**: Use Redis or database for high-volume production deployments

## Monitoring Metrics

Track these metrics in production:

```typescript
{
  deliverySuccessRate: 0.95,     // 95% success rate
  averageRetryCount: 1.2,        // Average retries per webhook
  dlqGrowthRate: 2,              // Items added to DLQ per hour
  p95DeliveryTime: 150,          // 95th percentile delivery time (ms)
  timeoutRate: 0.02              // 2% timeout rate
}
```
