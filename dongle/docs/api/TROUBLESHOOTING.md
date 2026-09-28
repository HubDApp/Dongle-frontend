# API Troubleshooting Guide

## Common Issues

### 1. Webhook Signature Verification Fails

**Symptoms:**
```json
{
  "error": "Invalid signature",
  "reason": "Signature mismatch"
}
```

**Causes & Solutions:**

#### A. Using Wrong Secret
```typescript
// ❌ Wrong
const secret = 'my-guess';

// ✅ Correct
const secret = process.env.WEBHOOK_SECRET;
```

#### B. Signing Parsed JSON Instead of Raw Body
```typescript
// ❌ Wrong - signing parsed object
const body = await request.json();
const signature = generateSignature(JSON.stringify(body), secret);

// ✅ Correct - signing raw body
const rawBody = await request.text();
const signature = generateSignature(rawBody, secret);
```

#### C. Timestamp Format Mismatch
```typescript
// ❌ Wrong
const timestamp = new Date().toString();

// ✅ Correct
const timestamp = new Date().toISOString();
```

#### D. Whitespace in Payload
```typescript
// Ensure no extra whitespace
const payload = JSON.stringify(data); // No spaces
// Not: JSON.stringify(data, null, 2) // Has formatting
```

**Debug Steps:**
1. Log both the expected and received signatures
2. Verify timestamp format is ISO 8601
3. Check secret is correctly loaded from environment
4. Verify you're using raw request body

### 2. Batch Submission Fails

**Symptoms:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Items array is required"
  }
}
```

**Causes & Solutions:**

#### A. Missing Required Fields
```typescript
// ❌ Wrong
{
  items: [
    { id: 'test' } // Missing 'data'
  ]
}

// ✅ Correct
{
  items: [
    { id: 'test', data: { name: 'Test' } }
  ]
}
```

#### B. Batch Too Large
```typescript
// ❌ Wrong - 150 items
const items = Array(150).fill({ id: '1', data: {} });

// ✅ Correct - Split into chunks of 100
const chunks = [];
for (let i = 0; i < items.length; i += 100) {
  chunks.push(items.slice(i, i + 100));
}
```

#### C. Invalid Data Type
```typescript
// ❌ Wrong
{ 
  items: { id: 'test', data: {} } // Object, not array
}

// ✅ Correct
{
  items: [{ id: 'test', data: {} }] // Array
}
```

### 3. Webhook Not Being Delivered

**Symptoms:**
- Webhook status shows "pending"
- Multiple retry attempts
- Eventually moves to dead letter queue

**Causes & Solutions:**

#### A. Endpoint Not Reachable
```bash
# Test endpoint manually
curl -X POST https://your-endpoint.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Solutions:**
- Verify URL is correct
- Check firewall rules
- Ensure endpoint is HTTPS
- Verify SSL certificate is valid

#### B. Endpoint Takes Too Long (>30s timeout)
```typescript
// ❌ Wrong - slow processing
app.post('/webhook', async (req, res) => {
  await slowProcessing(req.body); // Takes 45 seconds
  res.json({ received: true });
});

// ✅ Correct - respond quickly, process async
app.post('/webhook', async (req, res) => {
  // Respond immediately
  res.json({ received: true });
  
  // Process in background
  processWebhookAsync(req.body);
});
```

#### C. Endpoint Rejects Valid Signatures
Check your verification implementation matches the signature format.

### 4. Webhooks Creating Duplicates

**Symptoms:**
- Same webhook processed multiple times
- Duplicate data in your system

**Cause:**
Retries after slow responses can cause duplication.

**Solution: Implement Idempotency**

```typescript
const processedWebhooks = new Set<string>();

app.post('/webhook', async (req, res) => {
  const webhookId = req.headers['x-webhook-id'];
  
  // Check if already processed
  if (processedWebhooks.has(webhookId)) {
    console.log('Already processed:', webhookId);
    return res.json({ received: true, duplicate: true });
  }
  
  // Process webhook
  await processWebhook(req.body);
  
  // Mark as processed
  processedWebhooks.add(webhookId);
  
  res.json({ received: true });
});
```

**Better: Use Database**
```typescript
app.post('/webhook', async (req, res) => {
  const webhookId = req.headers['x-webhook-id'];
  
  // Try to insert webhook ID
  const inserted = await db.webhooks.insertIfNotExists({
    id: webhookId,
    received_at: new Date()
  });
  
  if (!inserted) {
    return res.json({ received: true, duplicate: true });
  }
  
  // Process webhook
  await processWebhook(req.body);
  res.json({ received: true });
});
```

### 5. High Dead Letter Queue Count

**Symptoms:**
- Many webhooks in DLQ
- Delivery success rate < 90%

**Investigation Steps:**

1. **Check DLQ Reasons**
```typescript
const response = await fetch('/api/webhooks/status');
const { deadLetterQueue } = await response.json();

deadLetterQueue.forEach(item => {
  console.log(`URL: ${item.url}`);
  console.log(`Reason: ${item.reason}`);
  console.log(`Attempts: ${item.attempts}`);
});
```

2. **Common Patterns:**
- Same endpoint failing repeatedly → Check endpoint health
- Timeout errors → Endpoint too slow
- Connection refused → Endpoint down
- SSL errors → Certificate issues

**Solutions:**

#### A. Add Circuit Breaker
```typescript
const failedEndpoints = new Map<string, number>();

async function shouldAttemptDelivery(url: string): boolean {
  const failures = failedEndpoints.get(url) || 0;
  
  if (failures > 10) {
    console.log(`Circuit open for ${url}`);
    return false; // Circuit open
  }
  
  return true;
}
```

#### B. Add Endpoint Health Checks
```typescript
async function checkEndpointHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

### 6. Performance Issues

**Symptoms:**
- Slow API responses
- High memory usage
- Request timeouts

**Solutions:**

#### A. Batch Size Too Large
```typescript
// Limit batch size on client
const MAX_BATCH = 50; // Instead of 100
```

#### B. Too Many Concurrent Webhooks
```typescript
// Implement queue with concurrency limit
import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 10 });

async function deliverWebhook(delivery: WebhookDelivery) {
  await queue.add(() => attemptDelivery(delivery));
}
```

#### C. Memory Leaks from Timers
```typescript
// Always clear timers
const timer = setTimeout(() => { /* ... */ }, delay);

// Store reference
timers.set(id, timer);

// Clean up when done
clearTimeout(timer);
timers.delete(id);
```

### 7. TypeScript Errors

**Symptoms:**
```
Type 'X' is not assignable to type 'Y'
```

**Solutions:**

#### A. Install Missing Types
```bash
npm install --save-dev @types/node @types/react
```

#### B. Check Import Paths
```typescript
// ❌ Wrong
import { WebhookPayload } from 'types/webhook';

// ✅ Correct
import { WebhookPayload } from '@/types/webhook';
```

#### C. Ensure Types Are Exported
```typescript
// types/webhook.ts
export interface WebhookPayload { // ← must have 'export'
  event: string;
  data: unknown;
}
```

### 8. Environment Variables Not Loading

**Symptoms:**
```
Error: WEBHOOK_SECRET is undefined
```

**Solutions:**

#### A. Create .env File
```bash
cp .env.example .env
```

#### B. Use Correct Prefix
```env
# ❌ Wrong (unless needed in browser)
WEBHOOK_SECRET=secret

# ✅ Correct for server-only
WEBHOOK_SECRET=secret

# For client-side (browser)
NEXT_PUBLIC_API_URL=https://api.example.com
```

#### C. Restart Dev Server
Changes to `.env` require restart:
```bash
# Stop server (Ctrl+C)
npm run dev
```

## Debug Mode

Enable detailed logging:

```typescript
// Set in .env
DEBUG=true
LOG_LEVEL=debug

// Or in code
process.env.DEBUG = 'true';
```

## Getting Additional Help

1. **Check Logs:**
   - Browser console (F12)
   - Server logs (terminal)
   - Network tab in DevTools

2. **Test with cURL:**
   ```bash
   curl -v -X POST http://localhost:3000/api/batch/submissions \
     -H "Content-Type: application/json" \
     -d '{"items":[{"id":"test","data":{"name":"Test"}}]}'
   ```

3. **Use API Testing Tools:**
   - Postman
   - Insomnia
   - REST Client (VS Code)

4. **Check the Examples:**
   - `examples/batch-submission-example.ts`
   - `examples/webhook-integration-example.ts`

5. **Review Documentation:**
   - [API Docs](/api/docs)
   - [OpenAPI Spec](/api/openapi)
   - GitHub Issues

## Still Having Issues?

Create an issue with:
- Error message (full stack trace)
- Code snippet (minimal reproduction)
- Environment (Node version, OS, etc.)
- What you've tried so far
