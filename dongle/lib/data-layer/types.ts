/**
 * Shared types for the coordinated data layer:
 * Request → Deduplication → Cache → Network
 * Mutation → Online execution | Offline queue → Sync → Invalidation
 */

export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE";

export type SyncUiStatus =
  | "idle"
  | "offline"
  | "reconnecting"
  | "syncing"
  | "synced"
  | "failed";

export type QueuedMutationStatus = "pending" | "in_flight" | "completed" | "failed";

export interface DataLayerConfig {
  /** Fresh-cache lifetime for GET responses (ms). */
  cacheTtlMs: number;
  /** Extra time cached data may be served while stale or offline (ms). */
  staleTtlMs: number;
  /**
   * After an in-flight request settles, identical GETs reuse the result
   * for this window (ms). Concurrent callers always share the in-flight
   * promise regardless of this value. 0 = in-flight sharing only.
   */
  dedupeWindowMs: number;
  /** Max replay attempts per queued mutation after reconnect. */
  syncMaxRetries: number;
  /** Initial backoff delay for mutation replay (ms). */
  syncInitialDelayMs: number;
  /** Backoff multiplier for mutation replay. */
  syncBackoffMultiplier: number;
  /** Cap for replay backoff (ms). */
  syncMaxDelayMs: number;
  /** Persist cache entries tagged for persistence to localStorage. */
  persistCache: boolean;
  /** Persist the offline mutation queue to localStorage. */
  persistQueue: boolean;
}

export interface RequestInput {
  method?: HttpMethod;
  url: string;
  /** Extra query parameters merged into the URL (sorted for the request key). */
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  /** Cache/invalidation group tags (e.g. "reviews", "drafts"). */
  tags?: string[];
  /** Store a successful GET in the data-layer cache. Default: true for GET. */
  cache?: boolean;
  cacheTtlMs?: number;
  staleTtlMs?: number;
  /** Persist this GET to localStorage when the URL is not sensitive. */
  persist?: boolean;
  /** Share in-flight / windowed results. Default: true for GET. */
  dedupe?: boolean;
  dedupeWindowMs?: number;
}

export interface GetJsonResult<T> {
  ok: boolean;
  status: number;
  data: T | undefined;
  error?: string;
  fromCache: boolean;
  stale: boolean;
}

export interface MutateInput {
  method: Exclude<HttpMethod, "GET" | "HEAD">;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  invalidateKeys?: string[];
  invalidateTags?: string[];
  invalidatePrefixes?: string[];
  /** Queue this mutation when offline. Default true. */
  queueWhenOffline?: boolean;
  /**
   * Stable identity used to collapse duplicate enqueues and to send as
   * the Idempotency-Key header. Generated from method+url+body when omitted.
   */
  idempotencyKey?: string;
  mutationType?: string;
}

export interface MutateResult<T> {
  ok: boolean;
  status?: number;
  data?: T;
  error?: string;
  queued: boolean;
  mutationId?: string;
}

export interface CacheRecord<T = unknown> {
  key: string;
  value: T;
  cachedAt: number;
  /** After this instant the entry is stale (may still be served offline). */
  staleAt: number;
  /** After this instant the entry is expired and must not be served online. */
  expiresAt: number;
  tags: string[];
  persist: boolean;
}

export interface QueuedMutation {
  id: string;
  idempotencyKey: string;
  mutationType?: string;
  method: Exclude<HttpMethod, "GET" | "HEAD">;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  invalidateKeys?: string[];
  invalidateTags?: string[];
  invalidatePrefixes?: string[];
  createdAt: number;
  attempts: number;
  status: QueuedMutationStatus;
  lastError?: string;
  completedAt?: number;
}

export interface DedupMetrics {
  requestCount: number;
  deduplicatedCount: number;
  networkCount: number;
  /** deduplicatedCount / requestCount, or 0 when no requests. */
  deduplicationRate: number;
}

export interface SyncReport {
  attempted: number;
  succeeded: number;
  failed: number;
  skippedDuplicate: number;
  errors: Array<{ id: string; error: string }>;
}

export class OfflineCacheMissError extends Error {
  readonly code = "OFFLINE_CACHE_MISS";
  readonly url: string;

  constructor(url: string) {
    super(`No cached data available for ${url} while offline`);
    this.name = "OfflineCacheMissError";
    this.url = url;
  }
}

export class DuplicateMutationError extends Error {
  readonly code = "DUPLICATE_MUTATION";
  readonly idempotencyKey: string;

  constructor(idempotencyKey: string) {
    super("Mutation already queued or recently completed");
    this.name = "DuplicateMutationError";
    this.idempotencyKey = idempotencyKey;
  }
}
