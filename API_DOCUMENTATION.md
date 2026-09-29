# Dongle Form API Documentation

Comprehensive API documentation for all available endpoints and SDKs.

## Table of Contents

1. [REST API](#rest-api)
2. [GraphQL API](#graphql-api)
3. [JavaScript/TypeScript SDK](#javascripttypescript-sdk)
4. [Python SDK](#python-sdk)
5. [Go SDK](#go-sdk)
6. [Ruby SDK](#ruby-sdk)
7. [Java SDK](#java-sdk)

---

## REST API

Base URL: `https://api.dongle.example.com`

### Authentication

Include your API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

### Endpoints

#### GET /api/reviews

Fetch reviews with pagination, filtering, and sorting.

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20, max: 100)
- `projectId` (optional) - Filter by project ID
- `userAddress` (optional) - Filter by user address
- `rating` (optional) - Filter by rating (1-5)
- `sortBy` (optional) - Sort field (default: createdAt)
- `sortOrder` (optional) - Sort direction: asc or desc (default: desc)

**Example Request:**
```bash
curl "https://api.dongle.example.com/api/reviews?page=1&limit=20&rating=5&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "review-123",
        "projectId": "project-456",
        "projectName": "DeFi Project",
        "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
        "rating": 5,
        "comment": "Great project!",
        "createdAt": "2026-09-28T10:00:00Z",
        "helpfulVotes": [],
        "unhelpfulVotes": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasMore": true
    },
    "rateLimit": {
      "limit": 100,
      "remaining": 95,
      "reset": 1735392000000
    }
  }
}
```

#### POST /api/reviews

Create a new review.

**Request Body:**
```json
{
  "projectId": "project-456",
  "projectName": "DeFi Project",
  "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
  "rating": 5,
  "comment": "Excellent project with great features!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "review-789",
    "projectId": "project-456",
    "rating": 5,
    "comment": "Excellent project with great features!",
    "createdAt": "2026-09-28T10:30:00Z"
  }
}
```

### Rate Limiting

- **Limit:** 100 requests per hour per API key
- **Headers:** Rate limit info included in all responses
- **Status Code:** 429 Too Many Requests when exceeded

---

## GraphQL API

Endpoint: `POST /api/graphql`

### Schema

```graphql
type Query {
  submissions(limit: Int, offset: Int, status: String): SubmissionConnection!
  submission(id: ID!): Submission
  reviews(projectId: String, limit: Int, offset: Int): ReviewConnection!
  review(id: ID!): Review
}

type Mutation {
  createSubmission(input: SubmissionInput!): SubmissionResult!
  updateSubmission(id: ID!, input: SubmissionInput!): SubmissionResult!
  deleteSubmission(id: ID!): DeleteResult!
  createReview(input: ReviewInput!): ReviewResult!
  updateReview(id: ID!, input: ReviewInput!): ReviewResult!
  deleteReview(id: ID!): DeleteResult!
}

type Subscription {
  submissionUpdated(id: ID): Submission!
  reviewUpdated(projectId: String): Review!
}
```

### Example Queries

**Fetch Submissions:**
```graphql
query GetSubmissions {
  submissions(limit: 10, status: "approved") {
    items {
      id
      projectName
      status
      qualityScore
      submittedAt
    }
    total
    hasMore
  }
}
```

**Create Review:**
```graphql
mutation CreateReview($input: ReviewInput!) {
  createReview(input: $input) {
    success
    review {
      id
      rating
      comment
      createdAt
    }
    error
  }
}

# Variables
{
  "input": {
    "projectId": "project-456",
    "rating": 5,
    "comment": "Great project!"
  }
}
```

**Subscribe to Updates:**
```graphql
subscription OnReviewUpdated($projectId: String!) {
  reviewUpdated(projectId: $projectId) {
    id
    rating
    comment
    createdAt
  }
}
```

---

## JavaScript/TypeScript SDK

### Installation

```bash
npm install @dongle/form-api-client
```

### Quick Start

```typescript
import { createClient } from '@dongle/form-api-client';

const client = createClient({
  baseUrl: 'https://api.dongle.example.com',
  apiKey: 'YOUR_API_KEY'
});

// Create submission
const result = await client.createSubmission({
  projectName: 'My Project',
  category: 'defi',
  description: 'Project description'
});

// Get reviews
const reviews = await client.getReviews({
  projectId: 'project-123',
  page: 1,
  limit: 20
});
```

### Full API Reference

See [packages/form-api-client/README.md](packages/form-api-client/README.md)

---

## Python SDK

### Installation

```bash
pip install dongle-api
```

### Quick Start

```python
from dongle_api import FormApiClient

client = FormApiClient(
    base_url='https://api.dongle.example.com',
    api_key='YOUR_API_KEY'
)

# Create submission
result = client.create_submission({
    'projectName': 'My Project',
    'category': 'defi',
    'description': 'Project description'
})

# Get reviews
reviews = client.get_reviews({
    'projectId': 'project-123',
    'page': 1,
    'limit': 20
})
```

### Full API Reference

See [sdks/python/README.md](sdks/python/README.md)

---

## Go SDK

### Installation

```bash
go get github.com/dongle/go-sdk
```

### Quick Start

```go
import "github.com/dongle/go-sdk/dongle"

client := dongle.NewClient(&dongle.Config{
    BaseURL: "https://api.dongle.example.com",
    APIKey:  "YOUR_API_KEY",
})

// Create submission
result, err := client.CreateSubmission(&dongle.SubmissionData{
    ProjectName: "My Project",
    Category:    "defi",
    Description: "Project description",
})

// Get reviews
reviews, err := client.GetReviews(&dongle.QueryParams{
    ProjectID: "project-123",
    Page:      1,
    Limit:     20,
})
```

### Full API Reference

See [sdks/go/README.md](sdks/go/README.md)

---

## Ruby SDK

### Installation

```bash
gem install dongle-api
```

### Quick Start

```ruby
require 'dongle'

client = Dongle::Client.new(
  base_url: 'https://api.dongle.example.com',
  api_key: 'YOUR_API_KEY'
)

# Create submission
result = client.create_submission(
  project_name: 'My Project',
  category: 'defi',
  description: 'Project description'
)

# Get reviews
reviews = client.get_reviews(
  project_id: 'project-123',
  page: 1,
  limit: 20
)
```

### Full API Reference

See [sdks/ruby/README.md](sdks/ruby/README.md)

---

## Java SDK

### Installation

**Maven:**
```xml
<dependency>
    <groupId>com.dongle</groupId>
    <artifactId>dongle-api</artifactId>
    <version>1.0.0</version>
</dependency>
```

**Gradle:**
```gradle
implementation 'com.dongle:dongle-api:1.0.0'
```

### Quick Start

```java
import com.dongle.api.DongleClient;
import com.dongle.api.models.*;

DongleClient client = new DongleClient.Builder()
    .baseUrl("https://api.dongle.example.com")
    .apiKey("YOUR_API_KEY")
    .build();

// Create submission
SubmissionData data = new SubmissionData.Builder()
    .projectName("My Project")
    .category("defi")
    .description("Project description")
    .build();
    
ApiResponse result = client.createSubmission(data);

// Get reviews
QueryParams params = new QueryParams.Builder()
    .projectId("project-123")
    .page(1)
    .limit(20)
    .build();
    
ApiResponse reviews = client.getReviews(params);
```

### Full API Reference

See [sdks/java/README.md](sdks/java/README.md)

---

## Common Patterns

### Error Handling

All SDKs provide consistent error handling:

**TypeScript:**
```typescript
try {
  await client.createSubmission(data);
} catch (error) {
  if (error instanceof FormApiError) {
    console.error(`${error.statusCode}: ${error.message}`);
  }
}
```

**Python:**
```python
try:
    client.create_submission(data)
except FormApiError as e:
    print(f'{e.status_code}: {e.message}')
```

**Go:**
```go
_, err := client.CreateSubmission(data)
if err != nil {
    if apiErr, ok := err.(*dongle.APIError); ok {
        fmt.Printf("%d: %s\n", apiErr.StatusCode, apiErr.Message)
    }
}
```

**Ruby:**
```ruby
begin
  client.create_submission(data)
rescue Dongle::APIError => e
  puts "#{e.status_code}: #{e.message}"
end
```

**Java:**
```java
try {
    client.createSubmission(data);
} catch (DongleApiException e) {
    System.err.println(e.getStatusCode() + ": " + e.getMessage());
}
```

### Pagination

All list endpoints support consistent pagination:

```
?page=1&limit=20
```

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```

### Filtering & Sorting

Supported query parameters:
- `status` - Filter by status
- `category` - Filter by category
- `projectId` - Filter by project
- `userAddress` - Filter by user
- `rating` - Filter by rating
- `sortBy` - Sort field
- `sortOrder` - asc or desc

---

## Support

For issues, questions, or contributions:
- GitHub: https://github.com/dongle/form-api
- Docs: https://docs.dongle.example.com
- Email: support@dongle.example.com
