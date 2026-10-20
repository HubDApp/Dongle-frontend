# Batch Form Submissions API

## Overview

The Batch Submissions API allows you to submit multiple forms in a single request, with support for atomic and individual processing modes.

## Endpoint

```
POST /api/batch/submissions
GET /api/batch/submissions
```

## Features

- ✅ Submit up to 100 forms per batch
- ✅ Atomic mode: All-or-nothing transaction
- ✅ Individual mode: Process each item independently
- ✅ Progress tracking for each item
- ✅ Error aggregation and reporting
- ✅ Performance optimized for high throughput

## Request Format

### POST /api/batch/submissions

**Request Body:**

```typescript
{
  items: Array<{
    id: string;
    data: object;
  }>;
  mode?: "atomic" | "individual"; // default: "individual"
}
```

### Processing Modes

#### Individual Mode (Default)
Each item is processed independently. Failures don't affect other items.

```json
{
  "mode": "individual",
  "items": [
    {
      "id": "form-1",
      "data": { "name": "Project Alpha", "category": "DeFi" }
    },
    {
      "id": "form-2",
      "data": { "name": "Project Beta", "category": "NFT" }
    }
  ]
}
```

#### Atomic Mode
All items must succeed or the entire batch fails (rollback).

```json
{
  "mode": "atomic",
  "items": [
    {
      "id": "form-1",
      "data": { "name": "Project Alpha", "category": "DeFi" }
    },
    {
      "id": "form-2",
      "data": { "name": "Project Beta", "category": "NFT" }
    }
  ]
}
```

## Response Format

```typescript
{
  success: boolean;
  mode: "atomic" | "individual";
  results: Array<{
    id: string;
    success: boolean;
    data?: object;
    error?: {
      code: string;
      message: string;
    };
  }>;
  successCount: number;
  failureCount: number;
  timestamp: string;
}
```

## Example Usage

### JavaScript/TypeScript

```typescript
async function submitBatch(items: Array<{ id: string; data: any }>) {
  const response = await fetch('/api/batch/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'individual',
      items
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log(`Processed ${result.data.successCount} items successfully`);
    
    // Handle individual failures
    result.data.results.forEach(item => {
      if (!item.success) {
        console.error(`Item ${item.id} failed: ${item.error?.message}`);
      }
    });
  }
}
```

### cURL

```bash
curl -X POST https://api.example.com/api/batch/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "individual",
    "items": [
      {
        "id": "form-1",
        "data": { "name": "Project Alpha", "category": "DeFi" }
      },
      {
        "id": "form-2",
        "data": { "name": "Project Beta", "category": "NFT" }
      }
    ]
  }'
```

## Error Handling

### Validation Errors (400)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Items array is required and must not be empty",
    "statusCode": 400,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Atomic Mode Failure (400)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Atomic batch failed at item form-2: Invalid data format",
    "statusCode": 400,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Rate Limits

- Maximum 100 items per batch
- Rate limit: 100 requests per minute per IP

## Best Practices

1. **Use Individual Mode for Independent Items**: When items don't depend on each other
2. **Use Atomic Mode for Related Items**: When consistency across items is critical
3. **Implement Client-Side Batching**: Group items in batches of 50-100 for optimal performance
4. **Handle Partial Failures**: In individual mode, always check each result
5. **Retry Failed Items**: Implement exponential backoff for failed items in individual mode

## Performance

- Average processing time: ~10ms per item
- Concurrent processing: Up to 10 items in parallel
- Recommended batch size: 50-100 items
