/**
 * OpenAPI 3.0 specification for the public Dongle REST API (/api/v1).
 *
 * Powers issue #718 acceptance criteria: OpenAPI/Swagger spec for the public
 * third-party API. Served by app/api/openapi/route.ts.
 */

import type { OpenAPIV3_1 } from "openapi-types";

export const PUBLIC_API_SPEC: OpenAPIV3_1.Document = {
  openapi: "3.1.0",
  info: {
    title: "Dongle Public API",
    version: "1.0.0",
    description:
      "Public REST API for third-party integrations with Dongle, the on-chain dApp store. Versioned under /v1/. Authenticate with an API key in the `X-API-Key` header.",
    contact: {
      name: "Dongle API Support",
      url: "https://dongle.app/support",
      email: "api@dongle.app",
    },
    license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
  },
  servers: [
    { url: "https://api.dongle.app/api/v1", description: "Production" },
    { url: "http://localhost:3000/api/v1", description: "Development" },
  ],
  tags: [
    { name: "Projects", description: "Discover and list dApp projects" },
    { name: "Reviews", description: "Project reviews and ratings" },
    { name: "Stats", description: "Aggregate platform metrics" },
  ],
  paths: {
    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects",
        description: "Paginated, filterable listing of registered dApp projects.",
        operationId: "listProjects",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10, minimum: 1, maximum: 100 } },
          { name: "category", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Paginated project list" } },
      },
    },
    "/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get a project",
        operationId: "getProject",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Project details" }, "404": { description: "Not found" } },
      },
    },
    "/reviews": {
      get: {
        tags: ["Reviews"],
        summary: "List reviews",
        description: "Reviews, optionally filtered by project.",
        operationId: "listReviews",
        parameters: [
          { name: "projectId", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10, maximum: 100 } },
        ],
        responses: { "200": { description: "List of reviews" } },
      },
    },
    "/stats": {
      get: {
        tags: ["Stats"],
        summary: "Platform metrics",
        operationId: "getStats",
        responses: { "200": { description: "Aggregate metrics" } },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API key for authentication and rate limiting (100 req/min)",
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};
