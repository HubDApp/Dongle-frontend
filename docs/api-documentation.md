# Dongle API Documentation

This document provides comprehensive API documentation for all Dongle backend endpoints, including request/response schemas, authentication requirements, error codes, and usage examples.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Reviews API](#reviews-api)
  - [Admin API](#admin-api)
  - [Drafts API](#drafts-api)

---

## Overview

The Dongle API provides RESTful endpoints for managing project reviews, verification requests, and user data. All endpoints accept and return JSON payloads.

**Key Features:**
- RESTful design with standard HTTP methods
- JSON request/response bodies
- Wallet-based authentication via Stellar addresses
- Comprehensive error messages with field-level validation
- CORS enabled for cross-origin requests

---

## Base URL

### Development
```
http://localhost:3000
```

### Production
```
https://dongle.app
```

All endpoint paths are relative to the base URL.

---

## Authentication

### Wallet Signature Authentication

Most write operations require wallet-based authentication. Users prove ownership of a Stellar address by providing it in request payloads.

**Authentication Method:**
- **Type:** Wallet address verification
- **Location:** Request body
- **Field:** `userAddress`
- **Format:** 56-character Stellar public key (G-address)

**Example:**
```json
{
  "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
  "rating": 5,
  "comment": "Great project!"
}
```

**Note:** Full cryptographic signature verification is planned for production. Current implementation validates address format and enforces one review per user per project.

### Admin Authentication

Admin-only endpoints require JWT token authentication.

**Authentication Method:**
- **Type:** Bearer token (JWT)
- **Location:** `Authorization` header
- **Format:** `Bearer <jwt_token>`

**Example:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Obtaining Admin Token:**
Admin tokens are issued by the `/api/admin/auth` endpoint after wallet signature verification.

---

## Rate Limiting

### Current Limits (Development)

No rate limiting enforced in development mode.

### Recommended Production Limits

| Endpoint Category | Rate Limit | Window |
|------------------|------------|--------|
| **Read Operations** (GET) | 100 requests | 1 minute |
| **Write Operations** (POST/PUT/DELETE) | 10 requests | 1 minute |
| **Admin Operations** | 50 requests | 1 minute |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

**Rate Limit Exceeded Response:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "success": false,
  "error": "Rate limit exceeded. Try again in 45 seconds.",
  "retryAfter": 45
}
```

---

## Error Handling

### Error Response Format

All errors return a consistent JSON structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "errors": [
    {
      "field": "comment",
      "message": "Comment must be at least 10 characters"
    }
  ]
}
```

**Fields:**
- `success` (boolean): Always `false` for errors
- `error` (string): General error message
- `errors` (array, optional): Field-specific validation errors

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| **200 OK** | Success | Successful GET, PUT, DELETE requests |
| **201 Created** | Resource created | Successful POST requests |
| **400 Bad Request** | Invalid input | Validation errors, malformed JSON |
| **401 Unauthorized** | Authentication required | Missing or invalid auth token |
| **403 Forbidden** | Permission denied | User lacks permission for resource |
| **404 Not Found** | Resource not found | Invalid ID or deleted resource |
| **409 Conflict** | Resource conflict | Duplicate review, concurrent modification |
| **500 Internal Server Error** | Server error | Unexpected server-side error |

### Common Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "errors": [
    {
      "field": "rating",
      "message": "Rating must be an integer between 1 and 5"
    },
    {
      "field": "comment",
      "message": "Comment must be at least 10 characters"
    }
  ]
}
```

#### Not Found (404)
```json
{
  "success": false,
  "error": "Review not found"
}
```

#### Forbidden (403)
```json
{
  "success": false,
  "error": "You do not have permission to edit this review"
}
```

#### Conflict (409)
```json
{
  "success": false,
  "errors": [
    {
      "field": "comment",
      "message": "You have already reviewed this project"
    }
  ]
}
```

---

## Endpoints

## Reviews API

### POST /api/reviews

Creates a new review for a project.

**Authentication:** Wallet address required

**Request Body:**
```json
{
  "projectId": "string (required)",
  "projectName": "string (required)",
  "userAddress": "string (required, 56-char G-address)",
  "rating": "number (required, integer 1-5)",
  "comment": "string (required, 10-1000 chars)"
}
```

**Request Example:**
```http
POST /api/reviews HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "projectId": "soroban-swap",
  "projectName": "Soroban Swap",
  "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
  "rating": 5,
  "comment": "Excellent DeFi protocol with low fees and fast transactions. Highly recommended!"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "projectId": "soroban-swap",
    "projectName": "Soroban Swap",
    "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
    "rating": 5,
    "comment": "Excellent DeFi protocol with low fees and fast transactions. Highly recommended!",
    "createdAt": "2026-08-27T10:30:00.000Z",
    "helpfulVotes": [],
    "unhelpfulVotes": []
  }
}
```

**Error Responses:**

*Validation Error (400):*
```json
{
  "success": false,
  "errors": [
    {
      "field": "comment",
      "message": "Comment must be at least 10 characters"
    }
  ]
}
```

*Duplicate Review (409):*
```json
{
  "success": false,
  "errors": [
    {
      "field": "comment",
      "message": "You have already reviewed this project"
    }
  ]
}
```

*Missing Fields (400):*
```json
{
  "success": false,
  "errors": [
    {
      "field": "comment",
      "message": "Missing required fields"
    }
  ]
}
```

**Validation Rules:**
- `projectId`: Required, non-empty string
- `projectName`: Required, non-empty string
- `userAddress`: Required, 56-character Stellar G-address
- `rating`: Required, integer between 1 and 5 (inclusive)
- `comment`: Required, 10-1000 characters
- One review per user per project (enforced via userAddress + projectId uniqueness)

**curl Example:**
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "soroban-swap",
    "projectName": "Soroban Swap",
    "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
    "rating": 5,
    "comment": "Great project with excellent documentation and community support!"
  }'
```

---

### GET /api/reviews

Retrieves reviews with optional filtering by project or user.

**Authentication:** None required

**Query Parameters:**
- `projectId` (string, optional): Filter by project ID
- `userAddress` (string, optional): Filter by user address

**Request Examples:**

*Get all reviews:*
```http
GET /api/reviews HTTP/1.1
Host: localhost:3000
```

*Get reviews for a specific project:*
```http
GET /api/reviews?projectId=soroban-swap HTTP/1.1
Host: localhost:3000
```

*Get reviews by a specific user:*
```http
GET /api/reviews?userAddress=GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "projectId": "soroban-swap",
      "projectName": "Soroban Swap",
      "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      "rating": 5,
      "comment": "Excellent DeFi protocol!",
      "createdAt": "2026-08-27T10:30:00.000Z",
      "helpfulVotes": ["GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674CH"],
      "unhelpfulVotes": []
    },
    {
      "id": "b2c3d4e5-f6g7-8901-bcde-f12345678901",
      "projectId": "soroban-swap",
      "projectName": "Soroban Swap",
      "userAddress": "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674CH",
      "rating": 4,
      "comment": "Good project, could use better error messages.",
      "createdAt": "2026-08-27T09:15:00.000Z",
      "helpfulVotes": [],
      "unhelpfulVotes": []
    }
  ]
}
```

**Sorting:**
Reviews are sorted by `createdAt` in descending order (newest first).

**curl Examples:**
```bash
# Get all reviews
curl http://localhost:3000/api/reviews

# Get reviews for a project
curl "http://localhost:3000/api/reviews?projectId=soroban-swap"

# Get reviews by a user
curl "http://localhost:3000/api/reviews?userAddress=GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"
```

---

### GET /api/reviews/[id]

Retrieves a specific review by ID.

**Authentication:** None required

**Path Parameters:**
- `id` (string, required): Review UUID

**Request Example:**
```http
GET /api/reviews/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "projectId": "soroban-swap",
    "projectName": "Soroban Swap",
    "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
    "rating": 5,
    "comment": "Excellent DeFi protocol!",
    "createdAt": "2026-08-27T10:30:00.000Z",
    "helpfulVotes": [],
    "unhelpfulVotes": []
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Review not found"
}
```

**curl Example:**
```bash
curl http://localhost:3000/api/reviews/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

### PUT /api/reviews/[id]

Updates an existing review. Only the review author can edit their review.

**Authentication:** Wallet address required (must match review author)

**Path Parameters:**
- `id` (string, required): Review UUID

**Request Body:**
```json
{
  "userAddress": "string (required, must match author)",
  "rating": "number (optional, integer 1-5)",
  "comment": "string (optional, 10-1000 chars)"
}
```

**Request Example:**
```http
PUT /api/reviews/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
  "rating": 4,
  "comment": "Updated review: Still good but found some minor issues."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "projectId": "soroban-swap",
    "projectName": "Soroban Swap",
    "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
    "rating": 4,
    "comment": "Updated review: Still good but found some minor issues.",
    "createdAt": "2026-08-27T10:30:00.000Z",
    "helpfulVotes": [],
    "unhelpfulVotes": []
  }
}
```

**Error Responses:**

*Not Found (404):*
```json
{
  "success": false,
  "errors": [
    {
      "field": "comment",
      "message": "Review not found"
    }
  ]
}
```

*Forbidden (403):*
```json
{
  "success": false,
  "errors": [
    {
      "field": "comment",
      "message": "You do not have permission to edit this review"
    }
  ]
}
```

*Validation Error (400):*
```json
{
  "success": false,
  "errors": [
    {
      "field": "comment",
      "message": "Comment must be at least 10 characters"
    }
  ]
}
```

**Partial Updates:**
You can update only `rating`, only `comment`, or both. Omitted fields remain unchanged.

**curl Example:**
```bash
curl -X PUT http://localhost:3000/api/reviews/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
    "rating": 4,
    "comment": "Updated: Good project but needs better documentation."
  }'
```

---

### DELETE /api/reviews/[id]

Deletes a review. Only the review author can delete their review.

**Authentication:** Wallet address required (must match review author)

**Path Parameters:**
- `id` (string, required): Review UUID

**Query Parameters:**
- `userAddress` (string, optional): User's Stellar address (alternative to body)

**Request Body (optional):**
```json
{
  "userAddress": "string (required if not in query)"
}
```

**Request Examples:**

*With query parameter:*
```http
DELETE /api/reviews/a1b2c3d4-e5f6-7890-abcd-ef1234567890?userAddress=GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H HTTP/1.1
Host: localhost:3000
```

*With request body:*
```http
DELETE /api/reviews/a1b2c3d4-e5f6-7890-abcd-ef1234567890 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Responses:**

*Not Found (404):*
```json
{
  "success": false,
  "error": "Review not found"
}
```

*Forbidden (403):*
```json
{
  "success": false,
  "error": "You do not have permission to delete this review"
}
```

**curl Examples:**
```bash
# Delete with query parameter
curl -X DELETE "http://localhost:3000/api/reviews/a1b2c3d4-e5f6-7890-abcd-ef1234567890?userAddress=GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"

# Delete with request body
curl -X DELETE http://localhost:3000/api/reviews/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"}'
```

---

## Admin API

### POST /api/admin/auth

Authenticates an admin user and issues a JWT token.

**Authentication:** Admin wallet address required

**Request Body:**
```json
{
  "walletAddress": "string (required, must be in ADMIN_ALLOWLIST)",
  "signature": "string (required, wallet signature)",
  "message": "string (required, signed message)"
}
```

**Request Example:**
```http
POST /api/admin/auth HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "walletAddress": "GA5WBPYA5Y4WAHXBCJNLQ66VCUCUHM65EPOREO6X22NHBZXGIHED56Y7",
  "signature": "3a8b7c9d...",
  "message": "Dongle admin authentication"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-08-28T10:30:00.000Z"
}
```

**Error Responses:**

*Unauthorized (401):*
```json
{
  "success": false,
  "error": "Wallet address not authorized for admin access"
}
```

*Invalid Signature (401):*
```json
{
  "success": false,
  "error": "Invalid wallet signature"
}
```

**Token Expiration:** 24 hours from issuance

**curl Example:**
```bash
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "GA5WBPYA5Y4WAHXBCJNLQ66VCUCUHM65EPOREO6X22NHBZXGIHED56Y7",
    "signature": "3a8b7c9d...",
    "message": "Dongle admin authentication"
  }'
```

---

### POST /api/admin/verify

Verifies an admin JWT token.

**Authentication:** Bearer token required

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Example:**
```http
POST /api/admin/verify HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "valid": true,
  "walletAddress": "GA5WBPYA5Y4WAHXBCJNLQ66VCUCUHM65EPOREO6X22NHBZXGIHED56Y7"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "valid": false,
  "error": "Invalid or expired token"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:3000/api/admin/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### POST /api/admin/refresh

Refreshes an admin JWT token before expiration.

**Authentication:** Valid Bearer token required

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Example:**
```http
POST /api/admin/refresh HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-08-29T10:30:00.000Z"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Token expired or invalid"
}
```

**curl Example:**
```bash
curl -X POST http://localhost:3000/api/admin/refresh \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Drafts API

### GET /api/drafts/[walletAddress]

Retrieves all project drafts for a specific wallet address.

**Authentication:** None required (read-only)

**Path Parameters:**
- `walletAddress` (string, required): User's Stellar G-address

**Request Example:**
```http
GET /api/drafts/GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "draft-123456",
      "walletAddress": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      "projectData": {
        "name": "My New Project",
        "category": "DeFi / DEX",
        "description": "Work in progress...",
        "websiteUrl": "https://myproject.com"
      },
      "createdAt": "2026-08-27T10:00:00.000Z",
      "updatedAt": "2026-08-27T10:30:00.000Z"
    }
  ]
}
```

**curl Example:**
```bash
curl http://localhost:3000/api/drafts/GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H
```

---

### DELETE /api/drafts/[walletAddress]/[draftId]

Deletes a specific draft.

**Authentication:** Wallet address must match draft owner

**Path Parameters:**
- `walletAddress` (string, required): User's Stellar G-address
- `draftId` (string, required): Draft UUID

**Request Example:**
```http
DELETE /api/drafts/GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H/draft-123456 HTTP/1.1
Host: localhost:3000
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Draft not found"
}
```

**curl Example:**
```bash
curl -X DELETE http://localhost:3000/api/drafts/GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H/draft-123456
```

---

## Appendix

### OpenAPI Specification

A machine-readable OpenAPI 3.0 specification is available at:

```
/api/openapi.json
```

This can be imported into tools like Postman, Swagger UI, or API documentation generators.

### Postman Collection

Import the API into Postman:

1. Download OpenAPI spec: `curl http://localhost:3000/api/openapi.json > dongle-api.json`
2. Open Postman → Import → Upload `dongle-api.json`
3. Set environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `userAddress`: Your Stellar G-address
   - `adminToken`: JWT token from `/api/admin/auth`

### Rate Limiting Best Practices

**Implementing Rate Limiting (Production):**

```typescript
// middleware/rateLimit.ts
import { NextRequest, NextResponse } from 'next/server';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(limit: number, windowMs: number) {
  return (req: NextRequest) => {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const key = `${ip}:${req.url}`;
    
    let rateLimitData = rateLimits.get(key);
    
    if (!rateLimitData || now > rateLimitData.resetAt) {
      rateLimitData = { count: 0, resetAt: now + windowMs };
    }
    
    rateLimitData.count++;
    rateLimits.set(key, rateLimitData);
    
    if (rateLimitData.count > limit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitData.resetAt - now) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitData.resetAt.toString(),
          },
        }
      );
    }
    
    return null; // Continue
  };
}
```

### CORS Configuration

**Current Configuration (Development):**
```typescript
// next.config.ts
const config = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ];
  },
};
```

**Production Recommendation:**
Restrict `Access-Control-Allow-Origin` to specific domains:
```typescript
{ key: 'Access-Control-Allow-Origin', value: 'https://dongle.app' }
```

---

## Support

For API issues or questions:
- Open an issue on GitHub with the `api` label
- Include request/response examples and error messages
- Specify environment (development/production)

## Changelog

### 2026-08-27
- Initial API documentation
- Reviews endpoints documented
- Admin authentication endpoints documented
- Drafts endpoints documented
- Added curl examples for all endpoints
- Added error handling section
- Added rate limiting guidelines
