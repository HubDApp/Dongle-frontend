# Webhook Signatures & Verification

## Overview

All webhooks are signed using HMAC-SHA256 to ensure authenticity and prevent tampering. Webhooks also include timestamps to prevent replay attacks.

## Signature Format

### Headers

```
X-Webhook-Signature: v1={hex_signature}
X-Webhook-Timestamp: 2024-01-15T10:30:00.000Z
X-Webhook-ID: 550e8400-e29b-41d4-a716-446655440000
```

### Signature Computation

The signature is computed as:

```
HMAC-SHA256(secret, "v1.{timestamp}.{json_payload}")
```

## Verifying Webhooks

### Step 1: Extract Headers

```typescript
const signature = request.headers['x-webhook-signature'];
const timestamp = request.headers['x-webhook-timestamp'];
const webhookId = request.headers['x-webhook-id'];
```

### Step 2: Verify Timestamp (Replay Attack Prevention)

```typescript
const requestTime = new Date(timestamp).getTime();
const now = Date.now();
const tolerance = 5 * 60 * 1000; // 5 minutes

if (Math.abs(now - requestTime) > tolerance) {
  throw new Error('Timestamp outside tolerance window');
}
```

### Step 3: Verify Signature

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  // Parse signature (format: v1=hex_signature)
  const [version, providedSig] = signature.split('=');
  
  if (version !== 'v1') {
    throw new Error('Unsupported signature version');
  }

  // Compute expected signature
  const signedPayload = `v1.${timestamp}.${payload}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload);
  const expectedSig = hmac.digest('hex');

  // Timing-safe comparison
  const providedBuffer = Buffer.from(providedSig, 'hex');
  const expectedBuffer = Buffer.from(expectedSig, 'hex');

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
```

## Complete Example

### Node.js/Express

```typescript
import express from 'express';
import { verifySignatureFromHeaders } from '@/lib/webhook-signature';

const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const payload = req.body.toString('utf8');
  const headers = req.headers;
  const secret = process.env.WEBHOOK_SECRET!;

  // Verify signature
  const verification = verifySignatureFromHeaders(payload, headers, secret);

  if (!verification.valid) {
    console.error('Webhook verification failed:', verification.error);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  const data = JSON.parse(payload);
  console.log('Webhook received:', data.event);

  res.status(200).json({ received: true });
});
```

### Next.js API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureFromHeaders } from '@/lib/webhook-signature';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  const secret = process.env.WEBHOOK_SECRET!;

  const verification = verifySignatureFromHeaders(payload, headers, secret);

  if (!verification.valid) {
    return NextResponse.json(
      { error: 'Invalid signature', reason: verification.error },
      { status: 401 }
    );
  }

  const data = JSON.parse(payload);
  // Process webhook...

  return NextResponse.json({ received: true });
}
```

### Python (Flask)

```python
import hmac
import hashlib
import time
from flask import Flask, request, jsonify

app = Flask(__name__)
SECRET = 'your-webhook-secret'

def verify_webhook(payload, signature, timestamp):
    # Check timestamp
    request_time = time.mktime(time.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.%fZ"))
    now = time.time()
    
    if abs(now - request_time) > 300:  # 5 minutes
        return False, "Timestamp outside tolerance"
    
    # Verify signature
    version, provided_sig = signature.split('=')
    if version != 'v1':
        return False, "Invalid version"
    
    signed_payload = f"v1.{timestamp}.{payload}"
    expected_sig = hmac.new(
        SECRET.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(provided_sig, expected_sig), None

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data(as_text=True)
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = request.headers.get('X-Webhook-Timestamp')
    
    valid, error = verify_webhook(payload, signature, timestamp)
    
    if not valid:
        return jsonify({'error': error}), 401
    
    # Process webhook
    data = request.get_json()
    print(f"Webhook received: {data['event']}")
    
    return jsonify({'received': True})
```

## Security Best Practices

1. **Always Verify Signatures**: Never process webhooks without verification
2. **Use Timing-Safe Comparison**: Prevents timing attacks
3. **Validate Timestamps**: Prevents replay attacks (5-minute tolerance)
4. **Keep Secrets Secure**: Store in environment variables, never commit
5. **Use HTTPS Only**: Webhook endpoints must use HTTPS
6. **Log Verification Failures**: Monitor for potential attacks
7. **Rotate Secrets Periodically**: Update webhook secrets every 90 days

## Webhook Events

| Event | Description |
|-------|-------------|
| `form.submitted` | New form submission received |
| `review.created` | New review posted |
| `project.updated` | Project information updated |
| `batch.completed` | Batch processing completed |
| `verification.approved` | Project verification approved |

## Testing Webhooks

### Generate Test Signature

```typescript
import { generateSignature } from '@/lib/webhook-signature';

const payload = { event: 'test', data: { hello: 'world' } };
const payloadString = JSON.stringify(payload);
const secret = 'test-secret';

const { signature, timestamp } = generateSignature(payloadString, secret);

console.log('X-Webhook-Signature:', signature);
console.log('X-Webhook-Timestamp:', timestamp);
```

### Test Endpoint

```bash
# Generate signature (use Node.js or online tool)
TIMESTAMP="2024-01-15T10:30:00.000Z"
PAYLOAD='{"event":"test","data":{"hello":"world"}}'
SECRET="test-secret"

# Sign: v1.{timestamp}.{payload}
SIGNED_PAYLOAD="v1.$TIMESTAMP.$PAYLOAD"
SIGNATURE=$(echo -n "$SIGNED_PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')

# Send request
curl -X POST https://your-app.com/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: v1=$SIGNATURE" \
  -H "X-Webhook-Timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

## Troubleshooting

### Common Issues

1. **"Invalid signature"**
   - Check that you're using the correct secret
   - Verify you're signing the raw body, not parsed JSON
   - Ensure timestamp format matches exactly

2. **"Timestamp outside tolerance"**
   - Check server time synchronization (NTP)
   - Verify timezone handling
   - Consider increasing tolerance in development

3. **"Unsupported signature version"**
   - Ensure signature format is `v1={hex}`
   - Check for extra whitespace in headers
