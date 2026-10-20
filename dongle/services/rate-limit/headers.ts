/**
 * Helpers to attach rate-limit headers to responses and to build 429s (#729).
 *
 * Uses the standard `Response` API so this works in both the Node.js and Edge
 * runtimes (Next.js middleware + route handlers).
 */

import { RATE_LIMIT_HEADERS, type RateLimitResult } from "./types";

/**
 * Apply X-RateLimit-* headers to a response in-place and return it.
 * On a blocked result the `Retry-After` header is also set.
 */
export function applyRateLimitHeaders<T extends Response>(
  response: T,
  result: RateLimitResult,
): T {
  response.headers.set(RATE_LIMIT_HEADERS.limit, String(result.limit));
  response.headers.set(RATE_LIMIT_HEADERS.remaining, String(result.remaining));
  response.headers.set(RATE_LIMIT_HEADERS.reset, String(result.resetAt));

  if (!result.allowed) {
    response.headers.set(RATE_LIMIT_HEADERS.retryAfter, String(result.retryAfterSeconds));
  }

  return response;
}

/** Build a JSON 429 response carrying the rate-limit headers. */
export function rateLimitResponse(result: RateLimitResult): Response {
  const body = JSON.stringify({
    error: "Too Many Requests",
    message: `Rate limit exceeded for ${result.category} requests. Try again in ${result.retryAfterSeconds} seconds.`,
    category: result.category,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.resetAt,
    retryAfterSeconds: result.retryAfterSeconds,
  });

  const response = new Response(body, {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });

  return applyRateLimitHeaders(response, result);
}
