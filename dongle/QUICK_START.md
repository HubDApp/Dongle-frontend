# Quick Start Guide - All 4 Features

## ✅ Features Implemented

1. **Batch Form Submissions** - Process up to 100 forms in one request
2. **Webhook Signatures** - HMAC-SHA256 signed webhooks with verification
3. **Smart Retry Logic** - Exponential backoff with dead letter queue
4. **OpenAPI Specification** - Auto-generated interactive docs

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd dongle
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Add to `.env`:
```env
WEBHOOK_SECRET=your-secure-random-secret-here-at-least-32-chars
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Access the API

- **Interactive API Docs**: http://localhost:3000/api/docs
- **OpenAPI Spec**: http://localhost:3000/api/openapi

---

## 📚 Test the Features

### Feature 1: Batch Submissions

```bash
# Test batch endpoint
curl -X POST http://localhost:3000/api/batch/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "individual",
    "items": [
      {"id": "item-1", "data": {"name": "Project A", "category": "DeFi"}},
      {"id": "item-2", "data": {"name": "Project B", "category": "NFT"}}
    ]
  }'

# Expected response:
{
  "success": true,
  "data": {
    "mode": "individual",
    "results": [
      {"id": "item-1", "success": true, "data": {...}},
      {"id": "item-2", "success": true, "data": {...}}
    ],
    "successCount": 2,
    "failureCount": 0
  }
}
```

### Feature 2 & 3: Signed Webhooks with Retry

```bash
# Send a webhook (will retry on failure)
curl -X POST http://localhost:3000/api/webhooks/send \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/unique-id",
    "event": "form.submitted",
    "data": {"formId": "123", "userId": "456"},
    "maxAttempts": 5
  }'

# Expected response:
{
  "success": true,
  "data": {
    "deliveryId": "uuid-here",
    "webhookId": "uuid-here",
    "status": "scheduled",
    "url": "https://webhook.site/unique-id"
  }
}

# Monitor webhook status
curl http://localhost:3000/api/webhooks/status

# Expected response:
{
  "success": true,
  "data": {
    "statistics": {
      "pendingCount": 1,
      "deadLetterCount": 0,
      "totalRetries": 0,
      "averageAttempts": 1
    },
    "pending": [...],
    "deadLetterQueue": [...]
  }
}
```

### Feature 4: OpenAPI Documentation

Open your browser:
- http://localhost:3000/api/docs - Interactive Swagger UI
- Try the "Try it out" button on any endpoint!

---

## 📖 Documentation Files

### API Guides
- `docs/api/README.md` - Complete API reference
- `docs/api/batch-submissions.md` - Batch processing guide
- `docs/api/webhook-signatures.md` - Security and verification
- `docs/api/webhook-retry-logic.md` - Retry strategy details

### Quick References
- `API_QUICK_REFERENCE.md` - One-page reference
- `FEATURE_IMPLEMENTATION_STATUS.md` - Detailed status report

### Code Examples
- `examples/batch-submission-example.ts` - Batch processing examples
- `examples/webhook-integration-example.ts` - Webhook integration

---

## 🧪 Run Tests

```bash
# All tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 🔑 Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/batch/submissions` | Submit batch of forms |
| GET | `/api/batch/submissions` | Get batch info |
| POST | `/api/webhooks/send` | Send signed webhook |
| GET | `/api/webhooks/status` | Monitor webhooks |
| POST | `/api/webhooks/status` | Retry from DLQ |
| GET | `/api/openapi` | OpenAPI spec JSON |
| GET | `/api/docs` | Interactive docs UI |

---

## 📝 Example: JavaScript Client

```javascript
// Send batch submission
async function submitBatch(items) {
  const response = await fetch('/api/batch/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'individual',
      items
    })
  });
  
  const result = await response.json();
  console.log(`Processed ${result.data.successCount} items`);
  return result;
}

// Send webhook with retry
async function sendWebhook(url, event, data) {
  const response = await fetch('/api/webhooks/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, event, data })
  });
  
  const result = await response.json();
  console.log('Delivery ID:', result.data.deliveryId);
  return result;
}

// Monitor webhooks
async function checkWebhookStatus() {
  const response = await fetch('/api/webhooks/status');
  const { data } = await response.json();
  
  console.log('Pending:', data.statistics.pendingCount);
  console.log('Failed:', data.statistics.deadLetterCount);
  return data;
}
```

---

## ✅ Verification Checklist

After running the dev server, verify:

- [ ] Navigate to http://localhost:3000/api/docs
- [ ] See interactive Swagger UI with all endpoints
- [ ] Try "Try it out" on batch submissions endpoint
- [ ] Submit a test batch request
- [ ] Send a test webhook
- [ ] Check webhook status
- [ ] View OpenAPI spec at /api/openapi

---

## 🎯 Next Steps

1. **Test All Features**: Use the interactive docs to test each endpoint
2. **Review Documentation**: Check `docs/api/` for detailed guides
3. **Customize**: Modify the business logic in route handlers
4. **Deploy**: See `FEATURE_IMPLEMENTATION_STATUS.md` for production checklist

---

## 💡 Tips

- **Testing Webhooks**: Use https://webhook.site to create test endpoints
- **Batch Size**: Maximum 100 items per batch
- **Retry Logic**: Default 5 attempts with exponential backoff
- **Signature Verification**: Always verify webhook signatures in production
- **Dead Letter Queue**: Monitor and retry failed webhooks from DLQ

---

## 📞 Need Help?

- 📖 **API Docs**: http://localhost:3000/api/docs
- 📄 **Full Documentation**: `docs/api/README.md`
- 🚀 **Quick Reference**: `API_QUICK_REFERENCE.md`
- 📊 **Status Report**: `FEATURE_IMPLEMENTATION_STATUS.md`

---

**All features are ready to use! 🎉**
