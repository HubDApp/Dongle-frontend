/**
 * Deterministic request-key generation.
 *
 * Keys distinguish requests by method, normalized URL (sorted query),
 * extra params, and a stable serialization of the body when present.
 */

import type { HttpMethod } from "./types";

export function stableStringify(value: unknown): string {
  if (value === undefined) return "";
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

function sortSearch(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const entries = [...params.entries()].sort(([a], [b]) => {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  });
  const sorted = new URLSearchParams();
  for (const [key, value] of entries) {
    sorted.append(key, value);
  }
  const qs = sorted.toString();
  return qs ? `?${qs}` : "";
}

function mergeParams(
  search: string,
  extra?: Record<string, string | number | boolean | null | undefined>,
): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined || value === null) continue;
      params.set(key, String(value));
    }
  }
  return sortSearch(params.toString());
}

/**
 * Split a URL into path + query without requiring an origin (relative URLs).
 */
export function splitUrl(url: string): { path: string; search: string } {
  const hashIndex = url.indexOf("#");
  const withoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf("?");
  if (queryIndex === -1) {
    return { path: withoutHash, search: "" };
  }
  return {
    path: withoutHash.slice(0, queryIndex),
    search: withoutHash.slice(queryIndex),
  };
}

export function buildUrlWithParams(
  url: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  const { path, search } = splitUrl(url);
  const merged = mergeParams(search, params);
  return `${path}${merged}`;
}

export interface RequestKeyInput {
  method?: HttpMethod | string;
  url: string;
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
}

/**
 * Build a deterministic cache / dedup key.
 * Unrelated requests (different URL, params, or body) produce different keys.
 */
export function createRequestKey(input: RequestKeyInput): string {
  const method = (input.method ?? "GET").toUpperCase();
  const url = buildUrlWithParams(input.url, input.params);
  const bodyPart = input.body === undefined ? "" : stableStringify(input.body);
  return `${method}:${url}${bodyPart ? `:body=${bodyPart}` : ""}`;
}

export function requestKeyPrefix(method: string, urlPath: string): string {
  return `${method.toUpperCase()}:${urlPath}`;
}
