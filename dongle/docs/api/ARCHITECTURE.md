# API Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│  (Web App, Mobile App, CLI Tools, Third-party Integrations)    │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                     │
             │ REST API                            │ Webhooks
             ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                          │
│  /api/batch/submissions     /api/webhooks/send                  │
│  /api/webhooks/status       /api/openapi                        │
└─────────────┬───────────────────────────────────┬───────────────┘
              │                                    │
              ▼                                    ▼
┌─────────────────────────┐    ┌──────────────────────────────────┐
│   Batch Processing      │    │    Webhook Retry Engine          │
│                         │    │                                  │
│  • Atomic Mode          │    │  • Exponential Backoff           │
│  • Individual Mode      │    │  • Jitter                        │
│  • Validation           │    │  • Dead Letter Queue             │
│  • Error Aggregation    │    │  • Monitoring                    │
└─────────────┬───────────┘    └───────────┬──────────────────────┘
              │                            │
              ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Core Services Layer                          │
│                                                                  │
│  • Signature Generation (HMAC-SHA256)                           │
│  • Signature Verification                                        │
│  • Retry Scheduling                                             │
│  • Error Handling                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow

### Batch Submission Flow

```
1. Client → POST /api/batch/submissions
                ↓
2. Validate Request
   - Check items array
   - Validate max size (100)
   - Verify item structure
                ↓
3. Process based on mode
   ┌──────────────┴──────────────┐
   │                              │
   ATOMIC MODE              INDIVIDUAL MODE
   │                              │
   Process all items        Process each item
   If any fails, rollback   Continue on failure
   │                              │
   └──────────────┬──────────────┘
                  ↓
4. Aggregate Results
   - Count successes/failures
   - Collect errors
                  ↓
5. Return Response
   - results array
   - statistics
   - timestamp
```

### Webhook Delivery Flow

```
1. Client → POST /api/webhooks/send
                ↓
2. Create Webhook Payload
   - Generate UUID
   - Add timestamp
   - Structure event data
                ↓
3. Generate Signature
   - HMAC-SHA256
   - Include timestamp
   - Version: v1
                ↓
4. Create Delivery Object
   - Set initial attempt = 0
   - Configure retry settings
   - Mark as pending
                ↓
5. Attempt Delivery
   ┌─────────┴─────────┐
   │                   │
   SUCCESS          FAILURE
   │                   │
   Mark complete    Increment attempt
   │                   │
   │                   ├─ Attempt < Max?
   │                   │  ├─ Yes → Schedule Retry
   │                   │  │         (exponential + jitter)
   │                   │  │
   │                   │  └─ No → Move to DLQ
   │                   │
   └─────────┬─────────┘
             ↓
6. Return Status
   - deliveryId
   - status
   - next retry time (if applicable)
```

## Component Architecture

### 1. API Layer (`app/api/`)

**Responsibilities:**
- HTTP request/response handling
- Input validation
- Route-specific logic
- Response formatting

**Key Files:**
- `batch/submissions/route.ts` - Batch processing endpoint
- `webhooks/send/route.ts` - Webhook dispatch
- `webhooks/status/route.ts` - Monitoring endpoint
- `openapi/route.ts` - Spec generation

### 2. Service Layer (`services/`)

**Responsibilities:**
- Business logic
- Orchestration
- State management
- Retry logic

**Key Files:**
- `webhook/webhook-retry.service.ts` - Retry engine
- `error/error.service.ts` - Error handling

### 3. Library Layer (`lib/`)

**Responsibilities:**
- Utility functions
- Pure functions
- Reusable logic
- Type-safe operations

**Key Files:**
- `webhook-signature.ts` - Cryptographic operations
- `openapi-generator.ts` - Spec generation

### 4. Type Layer (`types/`)

**Responsibilities:**
- TypeScript interfaces
- Type definitions
- Schema validation

**Key Files:**
- `batch.ts` - Batch types
- `webhook.ts` - Webhook types

## Data Flow Patterns

### 1. Synchronous Processing (Batch)

```typescript
Request → Validation → Processing → Response
          (instant)    (blocking)   (immediate)
```

Best for:
- Immediate results needed
- Small batch sizes
- User-facing operations

### 2. Asynchronous Processing (Webhooks)

```typescript
Request → Queue → Response
          ↓      (immediate)
          Background Processing
          ↓
          Retry Logic
          ↓
          Success/DLQ
```

Best for:
- Long-running operations
- External service calls
- Unreliable networks

## Retry Strategy Deep Dive

### Exponential Backoff Formula

```
delay = min(baseDelay × 2^attempt, maxDelay)
finalDelay = delay + (delay × jitterFactor × random(-1, 1))
```

**Example with defaults:**
```
baseDelay = 1000ms
maxDelay = 300000ms (5 minutes)
jitterFactor = 0.3 (30%)

Attempt 1: 1000ms × 2^0 = 1000ms ± 300ms = 700-1300ms
Attempt 2: 1000ms × 2^1 = 2000ms ± 600ms = 1400-2600ms
Attempt 3: 1000ms × 2^2 = 4000ms ± 1200ms = 2800-5200ms
Attempt 4: 1000ms × 2^3 = 8000ms ± 2400ms = 5600-10400ms
Attempt 5: 1000ms × 2^4 = 16000ms ± 4800ms = 11200-20800ms
```

### Why Jitter?

Without jitter:
```
Service fails → All clients retry at same time
             → Thundering herd problem
             → Service overwhelmed again
```

With jitter:
```
Service fails → Clients retry at different times
             → Distributed load
             → Service recovers gracefully
```

## Security Architecture

### Webhook Signature Flow

```
1. Sender Side
   ┌─────────────────────┐
   │ Webhook Payload     │
   │ + Timestamp         │
   └─────────┬───────────┘
             │
             ▼
   ┌─────────────────────┐
   │ Create Signed       │
   │ Payload String      │
   │ "v1.{time}.{json}"  │
   └─────────┬───────────┘
             │
             ▼
   ┌─────────────────────┐
   │ HMAC-SHA256(secret) │
   └─────────┬───────────┘
             │
             ▼
   ┌─────────────────────┐
   │ Headers:            │
   │ X-Webhook-Signature │
   │ X-Webhook-Timestamp │
   └─────────────────────┘

2. Receiver Side
   ┌─────────────────────┐
   │ Receive Request     │
   └─────────┬───────────┘
             │
             ▼
   ┌─────────────────────┐
   │ Extract Signature   │
   │ and Timestamp       │
   └─────────┬───────────┘
             │
             ▼
   ┌─────────────────────┐
   │ Verify Timestamp    │
   │ (5 min tolerance)   │
   └─────────┬───────────┘
             │ Valid?
             ├─ No → Reject (401)
             │
             ▼
   ┌─────────────────────┐
   │ Compute Expected    │
   │ Signature           │
   └─────────┬───────────┘
             │
             ▼
   ┌─────────────────────┐
   │ Timing-Safe         │
   │ Comparison          │
   └─────────┬───────────┘
             │ Match?
             ├─ No → Reject (401)
             │
             ▼
   ┌─────────────────────┐
   │ Process Webhook     │
   └─────────────────────┘
```

## Scalability Considerations

### Current Architecture (Development)
```
┌────────────────────┐
│   Single Server    │
│                    │
│  • In-memory queue │
│  • Local state     │
│  • Node.js timers  │
└────────────────────┘
```

**Limits:**
- ~1000 concurrent deliveries
- ~10,000 webhooks/minute
- Single point of failure

### Production Architecture (Recommended)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Server 1  │     │   Server 2  │     │   Server 3  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │    Redis Queue        │
              │                       │
              │  • Persistent state   │
              │  • Distributed locks  │
              │  • Pub/Sub            │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   PostgreSQL/MongoDB  │
              │                       │
              │  • Delivery history   │
              │  • Dead letter queue  │
              │  • Analytics          │
              └───────────────────────┘
```

**Benefits:**
- Horizontal scaling
- High availability
- Persistent state
- Better monitoring

## Performance Characteristics

### Batch Submissions

| Metric | Value |
|--------|-------|
| Max batch size | 100 items |
| Avg processing time | 10ms per item |
| Max concurrent requests | 100/minute |
| Memory per request | ~1MB |

### Webhook Deliveries

| Metric | Value |
|--------|-------|
| Delivery timeout | 30 seconds |
| Max concurrent deliveries | Limited by Node.js |
| Retry overhead | ~50ms per retry |
| Memory per delivery | ~10KB |

## Monitoring & Observability

### Key Metrics to Track

1. **Batch Processing**
   - Request rate
   - Success rate per mode
   - Average items per batch
   - Processing latency (p50, p95, p99)

2. **Webhook Deliveries**
   - Delivery success rate
   - Average retry count
   - DLQ growth rate
   - Time to delivery (p50, p95, p99)

3. **System Health**
   - Memory usage
   - CPU usage
   - Queue depth
   - Error rates

### Recommended Tools

- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack or Datadog
- **Tracing**: Jaeger or New Relic
- **Alerting**: PagerDuty or Opsgenie

## Testing Strategy

### Unit Tests
```typescript
// Test individual functions
describe('calculateRetryDelay', () => {
  it('implements exponential backoff', () => {
    // Test retry calculations
  });
});
```

### Integration Tests
```typescript
// Test API endpoints
describe('POST /api/batch/submissions', () => {
  it('processes batch successfully', async () => {
    // Test full request/response cycle
  });
});
```

### E2E Tests
```typescript
// Test complete user flows
test('submit batch and monitor status', async () => {
  // Test from user perspective
});
```

### Load Tests
```bash
# Test system under load
k6 run --vus 100 --duration 30s load-test.js
```

## Future Enhancements

1. **Rate Limiting**
   - Per-user quotas
   - Sliding window algorithm
   - Burst allowance

2. **Authentication**
   - API keys
   - JWT tokens
   - OAuth2

3. **Webhooks**
   - Circuit breakers
   - Health checks
   - Webhook transformations

4. **Batch Processing**
   - Progress streaming (SSE)
   - Cancellation support
   - Scheduled batches

5. **Documentation**
   - Client SDK generation
   - Postman collections
   - Request examples
