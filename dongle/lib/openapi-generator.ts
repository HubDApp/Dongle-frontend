/**
 * OpenAPI 3.1 specification generator for form API
 * Auto-generates from route definitions and types
 */

import type { OpenAPIV3_1 } from "openapi-types";

/**
 * Generate OpenAPI specification
 */
export function generateOpenAPISpec(): OpenAPIV3_1.Document {
  const spec: OpenAPIV3_1.Document = {
    openapi: "3.1.0",
    info: {
      title: "Dongle Form API",
      version: "1.0.0",
      description: "REST API for form submissions, reviews, and batch operations",
      contact: {
        name: "API Support",
        url: "https://example.com/support",
        email: "api@example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "https://api.example.com",
        description: "Production server",
      },
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Batch", description: "Batch form submission operations" },
      { name: "Webhooks", description: "Webhook management and monitoring" },
      { name: "Reviews", description: "Review submission and management" },
      { name: "Events", description: "Event tracking and querying" },
    ],
    paths: {
      "/api/batch/submissions": {
        post: {
          tags: ["Batch"],
          summary: "Submit multiple forms in batch",
          description:
            "Process multiple form submissions atomically or individually. Supports up to 100 items per batch.",
          operationId: "batchSubmit",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BatchSubmissionRequest" },
                examples: {
                  individual: {
                    summary: "Individual processing mode",
                    value: {
                      mode: "individual",
                      items: [
                        { id: "item-1", data: { name: "Project A", category: "DeFi" } },
                        { id: "item-2", data: { name: "Project B", category: "NFT" } },
                      ],
                    },
                  },
                  atomic: {
                    summary: "Atomic processing mode (all or nothing)",
                    value: {
                      mode: "atomic",
                      items: [
                        { id: "item-1", data: { name: "Project A", category: "DeFi" } },
                        { id: "item-2", data: { name: "Project B", category: "NFT" } },
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Batch processed successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/BatchSubmissionResponse" },
                },
              },
            },
            "400": {
              description: "Invalid request or validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "500": {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        get: {
          tags: ["Batch"],
          summary: "Get batch processing information",
          description: "Retrieve batch processing capabilities and statistics",
          operationId: "getBatchInfo",
          responses: {
            "200": {
              description: "Batch information retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      maxBatchSize: { type: "number" },
                      supportedModes: {
                        type: "array",
                        items: { type: "string" },
                      },
                      avgProcessingTime: { type: "string" },
                      rateLimit: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/webhooks/send": {
        post: {
          tags: ["Webhooks"],
          summary: "Send a signed webhook with retry logic",
          description:
            "Dispatch a webhook with HMAC signature, timestamp, and automatic retry with exponential backoff",
          operationId: "sendWebhook",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WebhookSendRequest" },
                example: {
                  url: "https://example.com/webhook",
                  event: "form.submitted",
                  data: { formId: "form-123", userId: "user-456" },
                  maxAttempts: 5,
                },
              },
            },
          },
          responses: {
            "202": {
              description: "Webhook scheduled for delivery",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/WebhookSendResponse" },
                },
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/webhooks/status": {
        get: {
          tags: ["Webhooks"],
          summary: "Get webhook delivery status and statistics",
          description:
            "Monitor webhook deliveries, pending retries, and dead letter queue",
          operationId: "getWebhookStatus",
          parameters: [
            {
              name: "deliveryId",
              in: "query",
              description: "Specific delivery ID to check (optional)",
              required: false,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Webhook status retrieved successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/WebhookStatusResponse" },
                },
              },
            },
          },
        },
        post: {
          tags: ["Webhooks"],
          summary: "Retry webhook from dead letter queue",
          description: "Move a failed webhook back to the delivery queue for retry",
          operationId: "retryWebhook",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["deliveryId", "action"],
                  properties: {
                    deliveryId: { type: "string" },
                    action: { type: "string", enum: ["retry"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Webhook retry initiated",
            },
            "404": {
              description: "Delivery not found in dead letter queue",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        BatchSubmissionRequest: {
          type: "object",
          required: ["items"],
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/BatchSubmissionItem" },
              minItems: 1,
              maxItems: 100,
            },
            mode: {
              type: "string",
              enum: ["atomic", "individual"],
              default: "individual",
              description:
                "atomic: all items must succeed or entire batch fails. individual: each item processed independently",
            },
          },
        },
        BatchSubmissionItem: {
          type: "object",
          required: ["id", "data"],
          properties: {
            id: { type: "string", description: "Unique identifier for this item" },
            data: {
              type: "object",
              description: "Form data payload",
              additionalProperties: true,
            },
          },
        },
        BatchSubmissionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            mode: { type: "string", enum: ["atomic", "individual"] },
            results: {
              type: "array",
              items: { $ref: "#/components/schemas/BatchSubmissionResult" },
            },
            successCount: { type: "number" },
            failureCount: { type: "number" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        BatchSubmissionResult: {
          type: "object",
          properties: {
            id: { type: "string" },
            success: { type: "boolean" },
            data: { type: "object", additionalProperties: true },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
        WebhookSendRequest: {
          type: "object",
          required: ["url", "event"],
          properties: {
            url: {
              type: "string",
              format: "uri",
              description: "Webhook endpoint URL",
            },
            event: {
              type: "string",
              description: "Event name/type",
              examples: ["form.submitted", "review.created", "project.updated"],
            },
            data: {
              type: "object",
              description: "Event payload data",
              additionalProperties: true,
            },
            maxAttempts: {
              type: "number",
              minimum: 1,
              maximum: 10,
              default: 5,
              description: "Maximum delivery attempts with exponential backoff",
            },
          },
        },
        WebhookSendResponse: {
          type: "object",
          properties: {
            deliveryId: { type: "string", format: "uuid" },
            webhookId: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["scheduled"] },
            url: { type: "string" },
          },
        },
        WebhookStatusResponse: {
          type: "object",
          properties: {
            statistics: {
              type: "object",
              properties: {
                pendingCount: { type: "number" },
                deadLetterCount: { type: "number" },
                totalRetries: { type: "number" },
                averageAttempts: { type: "number" },
              },
            },
            pending: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  url: { type: "string" },
                  attempt: { type: "number" },
                  maxAttempts: { type: "number" },
                  status: { type: "string" },
                  nextRetryAt: { type: "string", format: "date-time" },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
            deadLetterQueue: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  url: { type: "string" },
                  failedAt: { type: "string", format: "date-time" },
                  reason: { type: "string" },
                  attempts: { type: "number" },
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", enum: [false] },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                statusCode: { type: "number" },
                timestamp: { type: "string", format: "date-time" },
                requestId: { type: "string" },
              },
            },
          },
        },
      },
      securitySchemes: {
        webhookSignature: {
          type: "apiKey",
          in: "header",
          name: "X-Webhook-Signature",
          description:
            "HMAC-SHA256 signature: v1={signature}. Sign the payload: 'v1.{timestamp}.{jsonPayload}'",
        },
        webhookTimestamp: {
          type: "apiKey",
          in: "header",
          name: "X-Webhook-Timestamp",
          description: "ISO 8601 timestamp for replay attack prevention (5min tolerance)",
        },
      },
    },
  };

  return spec;
}

/**
 * Generate OpenAPI spec as JSON string
 */
export function generateOpenAPIJSON(): string {
  return JSON.stringify(generateOpenAPISpec(), null, 2);
}
