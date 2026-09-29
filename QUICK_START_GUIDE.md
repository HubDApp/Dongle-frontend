# Quick Start Guide - Form API

Get up and running with the Dongle Form API in minutes.

## Choose Your SDK

We provide official SDKs for:
- [JavaScript/TypeScript](#javascript--typescript)
- [Python](#python)
- [Go](#go)
- [Ruby](#ruby)
- [Java](#java)

Or use our [REST API](#rest-api) or [GraphQL API](#graphql) directly.

---

## JavaScript / TypeScript

### 1. Install

```bash
npm install @dongle/form-api-client
```

### 2. Initialize

```typescript
import { createClient } from '@dongle/form-api-client';

const client = createClient({
  baseUrl: 'https://api.dongle.example.com',
  apiKey: process.env.DONGLE_API_KEY // Optional
});
```

### 3. Use

```typescript
// Create a submission
const result = await client.createSubmission({
  projectName: 'My Stellar Project',
  category: 'defi',
  description: 'A decentralized finance application',
  websiteUrl: 'https://myproject.com'
});

console.log('Created:', result.data);
```

**[Full JavaScript Documentation →](packages/form-api-client/README.md)**

---

## Python

### 1. Install

```bash
pip install dongle-api
```

### 2. Initialize

```python
from dongle_api import FormApiClient

client = FormApiClient(
    base_url='https://api.dongle.example.com',
    api_key='YOUR_API_KEY'  # Optional
)
```

### 3. Use

```python
# Create a submission
result = client.create_submission({
    'projectName': 'My Stellar Project',
    'category': 'defi',
    'description': 'A decentralized finance application',
    'websiteUrl': 'https://myproject.com'
})

print('Created:', result['data'])
```

**[Full Python Documentation →](sdks/python/README.md)**

---

## Go

### 1. Install

```bash
go get github.com/dongle/go-sdk
```

### 2. Initialize

```go
import "github.com/dongle/go-sdk/dongle"

client := dongle.NewClient(&dongle.Config{
    BaseURL: "https://api.dongle.example.com",
    APIKey:  "YOUR_API_KEY", // Optional
})
```

### 3. Use

```go
// Create a submission
result, err := client.CreateSubmission(&dongle.SubmissionData{
    ProjectName: "My Stellar Project",
    Category:    "defi",
    Description: "A decentralized finance application",
    WebsiteURL:  "https://myproject.com",
})

if err != nil {
    log.Fatal(err)
}

fmt.Printf("Created: %+v\n", result.Data)
```

**[Full Go Documentation →](sdks/go/README.md)**

---

## Ruby

### 1. Install

```bash
gem install dongle-api
```

### 2. Initialize

```ruby
require 'dongle'

client = Dongle::Client.new(
  base_url: 'https://api.dongle.example.com',
  api_key: 'YOUR_API_KEY' # Optional
)
```

### 3. Use

```ruby
# Create a submission
result = client.create_submission(
  project_name: 'My Stellar Project',
  category: 'defi',
  description: 'A decentralized finance application',
  website_url: 'https://myproject.com'
)

puts "Created: #{result[:data]}"
```

**[Full Ruby Documentation →](sdks/ruby/README.md)**

---

## Java

### 1. Install

**Maven:**
```xml
<dependency>
    <groupId>com.dongle</groupId>
    <artifactId>dongle-api</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 2. Initialize

```java
import com.dongle.api.DongleClient;

DongleClient client = new DongleClient.Builder()
    .baseUrl("https://api.dongle.example.com")
    .apiKey("YOUR_API_KEY") // Optional
    .build();
```

### 3. Use

```java
// Create a submission
SubmissionData data = new SubmissionData.Builder()
    .projectName("My Stellar Project")
    .category("defi")
    .description("A decentralized finance application")
    .websiteUrl("https://myproject.com")
    .build();

ApiResponse result = client.createSubmission(data);
System.out.println("Created: " + result.getData());
```

**[Full Java Documentation →](sdks/java/README.md)**

---

## REST API

### Using cURL

```bash
# Create a submission
curl -X POST https://api.dongle.example.com/api/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "projectName": "My Stellar Project",
    "category": "defi",
    "description": "A decentralized finance application",
    "websiteUrl": "https://myproject.com"
  }'
```

### Using Fetch

```javascript
const response = await fetch('https://api.dongle.example.com/api/submissions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    projectName: 'My Stellar Project',
    category: 'defi',
    description: 'A decentralized finance application',
    websiteUrl: 'https://myproject.com'
  })
});

const result = await response.json();
```

**[Full REST API Documentation →](API_DOCUMENTATION.md#rest-api)**

---

## GraphQL

### Using POST Request

```bash
curl -X POST https://api.dongle.example.com/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createSubmission(input: { projectName: \"My Project\", category: \"defi\", description: \"Test\" }) { success submission { id } } }"
  }'
```

### Using Apollo Client

```typescript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://api.dongle.example.com/api/graphql',
  cache: new InMemoryCache()
});

const CREATE_SUBMISSION = gql`
  mutation CreateSubmission($input: SubmissionInput!) {
    createSubmission(input: $input) {
      success
      submission {
        id
        projectName
      }
    }
  }
`;

const result = await client.mutate({
  mutation: CREATE_SUBMISSION,
  variables: {
    input: {
      projectName: 'My Project',
      category: 'defi',
      description: 'A DeFi project'
    }
  }
});
```

**[Full GraphQL Documentation →](API_DOCUMENTATION.md#graphql-api)**

---

## Common Operations

### Pagination

```javascript
// JavaScript
const reviews = await client.getReviews({
  page: 1,
  limit: 20
});
```

### Filtering

```javascript
// JavaScript
const reviews = await client.getReviews({
  projectId: 'project-123',
  rating: 5,
  page: 1
});
```

### Sorting

```javascript
// JavaScript
const reviews = await client.getReviews({
  sortBy: 'createdAt',
  sortOrder: 'desc'
});
```

---

## Error Handling

All SDKs provide consistent error handling:

```typescript
// TypeScript
import { FormApiError } from '@dongle/form-api-client';

try {
  await client.createSubmission(data);
} catch (error) {
  if (error instanceof FormApiError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
  }
}
```

```python
# Python
from dongle_api import FormApiError

try:
    client.create_submission(data)
except FormApiError as e:
    print(f'Error {e.status_code}: {e.message}')
```

---

## Next Steps

1. **Read the full documentation**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
2. **Check out examples**: See the `examples/` directory in each SDK
3. **Explore GraphQL schema**: GET `/api/graphql` for schema introspection
4. **Join the community**: GitHub Issues for questions and support

## Need Help?

- 📖 [Full API Documentation](API_DOCUMENTATION.md)
- 💬 [GitHub Issues](https://github.com/dongle/form-api/issues)
- 📧 Email: support@dongle.example.com
