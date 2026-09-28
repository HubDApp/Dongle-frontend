# Getting Started with the API

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Environment variables configured

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd dongle
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Add your webhook secret:
```env
WEBHOOK_SECRET=your-secret-key-here
```

4. **Start development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Your First API Call

### 1. Submit a Batch

Create a file `test-batch.ts`:

```typescript
async function testBatch() {
  const response = await fetch('http://localhost:3000/api/batch/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'individual',
      items: [
        {
          id: 'test-1',
          data: {
            name: 'My First Project',
            category: 'DeFi',
            description: 'A test project'
          }
        }
      ]
    })
  });

  const result = await response.json();
  console.log('Result:', result);
}

testBatch();
```

Run it:
```bash
npx tsx test-batch.ts
```

### 2. Send a Webhook

```typescript
async function testWebhook() {
  const response = await fetch('http://localhost:3000/api/webhooks/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://webhook.site/your-unique-url', // Get from webhook.site
      event: 'test.event',
      data: { message: 'Hello from webhook!' }
    })
  });

  const result = await response.json();
  console.log('Delivery ID:', result.data.deliveryId);
}

testWebhook();
```

### 3. Monitor Webhooks

```bash
curl http://localhost:3000/api/webhooks/status
```

## Explore the Interactive Docs

Visit `http://localhost:3000/api/docs` to:
- Browse all endpoints
- See request/response schemas
- Try API calls directly from the browser
- View code examples

## Next Steps

1. **Read the guides**
   - [Batch Submissions](./batch-submissions.md)
   - [Webhook Signatures](./webhook-signatures.md)
   - [Webhook Retry Logic](./webhook-retry-logic.md)

2. **Check the examples**
   - `examples/batch-submission-example.ts`
   - `examples/webhook-integration-example.ts`

3. **Run the tests**
   ```bash
   npm test
   ```

4. **Build your integration**
   - Use the OpenAPI spec to generate client libraries
   - Implement webhook receivers
   - Build batch processing workflows

## Common Issues

### "WEBHOOK_SECRET not found"
Set the environment variable:
```bash
export WEBHOOK_SECRET="your-secret-key"
```

### Port already in use
Change the port:
```bash
PORT=3001 npm run dev
```

### CORS errors
The API includes CORS headers for `/api/openapi`. For other endpoints, configure in your Next.js middleware.

## Getting Help

- 📚 [Full API Documentation](./README.md)
- 🔍 [Interactive API Explorer](/api/docs)
- 💬 [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 Email: api@example.com
