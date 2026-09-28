# API Quick Reference

## 📋 Quick Links

| Resource | URL |
|----------|-----|
| **Interactive Docs** | http://localhost:3000/api/docs |
| **OpenAPI Spec** | http://localhost:3000/api/openapi |
| **Full Documentation** | [docs/api/README.md](./docs/api/README.md) |
| **Getting Started** | [docs/api/GETTING_STARTED.md](./docs/api/GETTING_STARTED.md) |

---

## 🚀 Quick Start Commands

```bash
# Setup
npm install
cp .env.example .env
# Add WEBHOOK_SECRET to .env

# Run
npm run dev              # Start server
npm test                 # Run tests
npm run typecheck        # Check types

# Access
# http://localhost:3000/api/docs
```

---

## 📡 API Endpoints

### Batch Submissions

```bash
# Submit batch (individual mode)
POST /api/batch/submissions
Content-Type: application/json

{
  "mode": "individual",
  "items": [
    { "id": "item-1", "data": { "name": "Project A" } }
  ]
}

# Get batch info
GET /api/batch/submissions
```

### Webhooks

```bash
# Send webhook with retry
POST /api/webhooks/send
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "event": "form.submitted",
  "data": { "formId": "123" },
  "maxAttempts": 5
}

# Monitor webhooks
GET /api/webhooks/status
GET /api/webhooks/status?deliveryId={id}

# Retry from DLQ
POST /api/webhooks/status
{
  "deliveryId": "{id}",
  "action": "retry"
}
```

---

## 🔐 Webhook Security

### Signature Headers
```
X-Webhook-Signature: v1=abc123...
X-Webhook-Timestamp: 2024-01-15T10:30:00.000Z
X-Webhook-ID: uuid
```

### Verify Signature (Node.js)
```typescript
import { verifySignatureFromHeaders } from '@/lib/webhook-signature';

const body = await request.text();
const headers = Object.fromEntries(request.headers.entries());
const secret = process.env.WEBHOOK_SECRET!;

const { valid, error } = verifySignatureFromHeaders(body, headers, secret);
```

---

## 🔄 Retry Schedule

| Attempt | Delay | Cumulative |
|---------|-------|------------|
| 1 | ~1s | 1s |
| 2 | ~2s | 3s |
| 3 | ~4s | 7s |
| 4 | ~8s | 15s |
| 5 | ~16s | 31s |

---

## 📊 Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description",
    "statusCode": 400
  }
}
```

---

## 🎯 Processing Modes

### Atomic Mode
All items must succeed or entire batch fails.

```json
{ "mode": "atomic", "items": [...] }
```

### Individual Mode (Default)
Each item processed independently.

```json
{ "mode": "individual", "items": [...] }
```

---

## ⚡ Rate Limits

| Endpoint | Limit |
|----------|-------|
| Batch submissions | 100/min |
| Webhook send | 1000/min |

---

## 🛠️ Code Examples

### TypeScript/React
```typescript
// Batch submission
const response = await fetch('/api/batch/submissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'individual',
    items: [{ id: '1', data: { name: 'Test' } }]
  })
});

const result = await response.json();
console.log('Success:', result.data.successCount);
```

### cURL
```bash
curl -X POST http://localhost:3000/api/batch/submissions \
  -H "Content-Type: application/json" \
  -d '{"mode":"individual","items":[{"id":"1","data":{"name":"Test"}}]}'
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| PowerShell script error | Run: `Set-ExecutionPolicy RemoteSigned` |
| Signature verification fails | Check you're using raw body, not parsed |
| Batch too large | Max 100 items, split into chunks |
| Webhook not delivered | Check endpoint is HTTPS and responds in <30s |

---

## 📚 Documentation Index

1. **[README.md](./docs/api/README.md)** - Complete API reference
2. **[GETTING_STARTED.md](./docs/api/GETTING_STARTED.md)** - Quick start guide
3. **[ARCHITECTURE.md](./docs/api/ARCHITECTURE.md)** - System design
4. **[batch-submissions.md](./docs/api/batch-submissions.md)** - Batch guide
5. **[webhook-signatures.md](./docs/api/webhook-signatures.md)** - Security guide
6. **[webhook-retry-logic.md](./docs/api/webhook-retry-logic.md)** - Retry guide
7. **[TROUBLESHOOTING.md](./docs/api/TROUBLESHOOTING.md)** - Debug help
8. **[WINDOWS_SETUP.md](./WINDOWS_SETUP.md)** - Windows setup

---

## ✅ Feature Checklist

### Batch Submissions
- ✅ Atomic/individual modes
- ✅ Max 100 items
- ✅ Error per item
- ✅ Progress tracking

### Webhooks  
- ✅ HMAC-SHA256 signing
- ✅ Exponential backoff
- ✅ Dead letter queue
- ✅ Monitoring dashboard

### Documentation
- ✅ OpenAPI 3.1 spec
- ✅ Interactive Swagger UI
- ✅ Code examples
- ✅ Troubleshooting

---

## 🎓 Next Steps

1. ✅ Start dev server: `npm run dev`
2. ✅ Open interactive docs: http://localhost:3000/api/docs
3. ✅ Try example requests
4. ✅ Read guides in `docs/api/`
5. ✅ Check examples in `examples/`

---

## 📞 Get Help

- 📖 Interactive Docs: `/api/docs`
- 📄 Full Docs: `docs/api/README.md`
- 🐛 Troubleshooting: `docs/api/TROUBLESHOOTING.md`
- 💬 GitHub Issues

---

**All 4 features complete and ready to use! 🚀**
