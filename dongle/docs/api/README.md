# API Documentation

## Overview

Complete REST API for form submissions, reviews, batch operations, and webhooks with enterprise-grade features including signature verification, smart retry logic, and interactive documentation.

## Quick Links

- 📚 [Interactive API Docs](/api/docs) - Swagger UI with "Try it out"
- 📄 [OpenAPI Spec](/api/openapi) - OpenAPI 3.1 JSON
- 🔐 [Webhook Signatures](./webhook-signatures.md) - Security guide
- 🔄 [Webhook Retry Logic](./webhook-retry-logic.md) - Smart retry system
- 📦 [Batch Submissions](./batch-submissions.md) - Bulk operations

## Features

### ✅ Batch Form Submissions
- Process up to 100 forms in a single request
- Atomic or individual processing modes
- Detailed error reporting per item
- Progress tracking support

### ✅ Webhook System
- HMAC-SHA256 signature verification
- Exponential backoff with jitter
- Dead letter queue for failed deliveries
- Real-time monitoring dashboard
- Configurable retry attempts (up to 10)

### ✅ OpenAPI Documentation
- Auto-generated from code
- Interactive Swagger UI
- Complete schemas and examples
- Always stays in sync

## API Endpoints

### Batch Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/batch/submissions` | POST | Submit multiple forms in batch |
| `/api/batch/submissions` | GET | Get batch processing info |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/send` | POST | Send signed webhook with retry |
| `/api/webhooks/status` | GET | Monitor webhook deliveries |
| `/api/webhooks/status` | POST | Retry failed webhook |

### Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/openapi` | GET | OpenAPI 3.1 specification |
| `/api/docs` | GET | Interactive Swagger UI |

## Quick Start

### 1. Batch Submission

```typescript
const response = await fetch('/api/batch/submissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'individual',
    items: [
      { id: 'item-1', data: { name: 'Project A', category: 'DeFi' } },
      { id: 'item-2', data: { name: 'Project B', category: 'NFT' } }
    ]
  })
});

const result = await response.json();
console.log(`Processed: ${result.data.successCount}/${result.data.results.length}`);
```

### 2. Send Webhook with Retry

```typescript
const response = await fetch('/api/webhooks/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/webhook',
    event: 'form.submitted',
    data: { formId: '123', userId: '456' },
    maxAttempts: 5
  })
});

const result = await response.json();
console.log('Delivery ID:', result.data.deliveryId);
```

### 3. Verify Webhook Signature

```typescript
import { verifySignatureFromHeaders } from '@/lib/webhook-signature';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  const secret = process.env.WEBHOOK_SECRET!;

  const verification = verifySignatureFromHeaders(body, headers, secret);
  
  if (!verification.valid) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  const payload = JSON.parse(body);
  // Process webhook...
  
  return NextResponse.json({ received: true });
}
```

### 4. Monitor Webhooks

```typescript
const response = await fetch('/api/webhooks/status');
const { statistics, pending, deadLetterQueue } = await response.json();

console.log('Pending:', statistics.pendingCount);
console.log('Failed:', statistics.deadLetterCount);
console.log('Avg Attempts:', statistics.averageAttempts);
```

## Authentication

Currently, the API uses environment-based authentication. For production:

1. Set `WEBHOOK_SECRET` in your environment variables
2. Implement API key authentication for batch endpoints
3. Use OAuth2 for user-specific operations

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Batch Submissions | 100 requests/minute |
| Webhook Send | 1000 requests/minute |
| Webhook Status | Unlimited |

## Response Format

All endpoints follow a standardized format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "statusCode": 400,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request parameters |
| `AUTHENTICATION_ERROR` | Missing or invalid credentials |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

## Webhook Events

| Event | Triggered When |
|-------|---------------|
| `form.submitted` | New form submission |
| `review.created` | Review posted |
| `project.updated` | Project info updated |
| `batch.completed` | Batch processing done |
| `verification.approved` | Verification approved |

## Security

### Webhook Signatures
- All webhooks signed with HMAC-SHA256
- Timestamp validation prevents replay attacks (5min window)
- Timing-safe signature comparison

### Best Practices
1. Always verify webhook signatures
2. Use HTTPS endpoints only
3. Implement idempotent handlers
4. Rotate secrets every 90 days
5. Monitor failed deliveries
6. Log verification failures

## Examples

Complete examples available in:
- `examples/batch-submission-example.ts`
- `examples/webhook-integration-example.ts`

## Testing

```bash
# Run all tests
npm test

# Test specific features
npm test webhook
npm test batch

# E2E tests
npm run test:e2e
```

## Code Examples

### React Hook for Batch Submissions

```typescript
import { useState } from 'react';
import type { BatchSubmissionRequest } from '@/types/batch';

export function useBatchSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (items: BatchSubmissionRequest['items']) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/batch/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'individual', items }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submit, loading, error };
}
```

### Webhook Dashboard Component

```typescript
'use client';

import { useEffect, useState } from 'react';

export function WebhookDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/webhooks/status');
      const data = await res.json();
      setStats(data.data);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Webhook Monitor</h2>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-blue-100 rounded">
          <div className="text-2xl font-bold">{stats.statistics.pendingCount}</div>
          <div className="text-sm">Pending</div>
        </div>
        <div className="p-4 bg-red-100 rounded">
          <div className="text-2xl font-bold">{stats.statistics.deadLetterCount}</div>
          <div className="text-sm">Failed</div>
        </div>
        <div className="p-4 bg-yellow-100 rounded">
          <div className="text-2xl font-bold">{stats.statistics.totalRetries}</div>
          <div className="text-sm">Total Retries</div>
        </div>
        <div className="p-4 bg-green-100 rounded">
          <div className="text-2xl font-bold">
            {stats.statistics.averageAttempts.toFixed(1)}
          </div>
          <div className="text-sm">Avg Attempts</div>
        </div>
      </div>
    </div>
  );
}
```

## Production Checklist

- [ ] Set `WEBHOOK_SECRET` environment variable
- [ ] Implement API authentication
- [ ] Replace in-memory stores with database/Redis
- [ ] Set up monitoring and alerting
- [ ] Configure rate limiting
- [ ] Add request logging
- [ ] Set up webhook endpoint health checks
- [ ] Implement circuit breakers
- [ ] Add metrics collection (Prometheus)
- [ ] Set up log aggregation (ELK/Datadog)

## Support

For issues or questions:
- Check [API Documentation](/api/docs)
- Review [GitHub Issues](https://github.com/your-repo/issues)
- Contact: api@example.com

## Changelog

### v1.0.0 (2024-01-15)
- ✅ Batch submissions with atomic/individual modes
- ✅ Webhook signing with HMAC-SHA256
- ✅ Smart retry with exponential backoff
- ✅ Dead letter queue
- ✅ Monitoring dashboard
- ✅ OpenAPI 3.1 specification
- ✅ Interactive Swagger UI documentation
