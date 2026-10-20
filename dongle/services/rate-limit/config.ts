/**
 * Default rate-limit quotas per endpoint category (Issue #729).
 *
 * Anonymous (per-IP) limits match the issue spec; authenticated callers get a
 * multiplier applied on top. All windows are one minute.
 */

import type { RateLimitConfig } from "./types";

export const RATE_LIMIT_WINDOW_SECONDS = 60;

/** How many times the anonymous quota an authenticated caller may use. */
export const AUTHENTICATED_MULTIPLIER = 3;

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  read: {
    limit: 100,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    authenticatedMultiplier: AUTHENTICATED_MULTIPLIER,
  },
  write: {
    limit: 10,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    authenticatedMultiplier: AUTHENTICATED_MULTIPLIER,
  },
  search: {
    limit: 30,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    authenticatedMultiplier: AUTHENTICATED_MULTIPLIER,
  },
  admin: {
    limit: 50,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    authenticatedMultiplier: AUTHENTICATED_MULTIPLIER,
  },
};

/**
 * Classify a request path + method into a rate-limit category.
 *
 * Precedence: admin > search > write > read.
 */
export function classifyRequest(pathname: string, method: string): RateLimitCategory {
  const methodUpper = method.toUpperCase();
  const path = pathname.toLowerCase();

  if (path.startsWith("/api/admin") || path.includes("/admin/")) {
    return "admin";
  }

  if (
    path.includes("search") ||
    path.includes("/discover") ||
    path.endsWith("/api/projects") ||
    path.startsWith("/api/projects/validate")
  ) {
    return "search";
  }

  if (methodUpper === "GET" || methodUpper === "HEAD" || methodUpper === "OPTIONS") {
    return "read";
  }

  return "write";
}
