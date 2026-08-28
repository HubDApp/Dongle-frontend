export type {
  DataLayerConfig,
  DedupMetrics,
  GetJsonResult,
  HttpMethod,
  MutateInput,
  MutateResult,
  QueuedMutation,
  RequestInput,
  SyncReport,
  SyncUiStatus,
} from "./types";
export { DuplicateMutationError, OfflineCacheMissError } from "./types";

export {
  configureDataLayer,
  DATA_LAYER_DEFAULTS,
  getDataLayerConfig,
  resetDataLayerConfig,
} from "./config";

export { buildUrlWithParams, createRequestKey, stableStringify } from "./request-key";
export { getDedupMetrics, resetDedupMetrics } from "./metrics";

export {
  isOnline,
  setOnline,
  startConnectivityMonitor,
  stopConnectivityMonitor,
  subscribeConnectivity,
} from "./connectivity";

export {
  cacheClear,
  cacheDelete,
  cacheGet,
  cacheGetFresh,
  cacheKeys,
  cacheSet,
  evictExpiredCache,
  evictStaleCache,
} from "./cache";

export { dedupeHasInflight, dedupeRun } from "./deduplication";

export {
  getCacheGeneration,
  invalidateAfterMutation,
  invalidateAll,
  invalidateKey,
  invalidateKeys,
  invalidatePrefix,
  invalidateStale,
  invalidateTag,
  invalidateTags,
  subscribeInvalidation,
} from "./invalidation";

export {
  createIdempotencyKey,
  enqueueMutation,
  findByIdempotencyKey,
  getPendingMutations,
  getQueuedMutations,
} from "./mutation-queue";

export {
  getLastSyncError,
  getPendingMutationCount,
  getSyncUiStatus,
  subscribeSyncStatus,
} from "./sync-status";

export {
  getDataLayerSnapshot,
  getJson,
  isSensitiveUrl,
  mutate,
  requestJson,
  startAutomaticSync,
  syncQueuedMutations,
} from "./client";

import { resetCacheForTests } from "./cache";
import { resetClientForTests } from "./client";
import { resetDataLayerConfig } from "./config";
import { resetConnectivityForTests } from "./connectivity";
import { resetDedupForTests } from "./deduplication";
import { resetInvalidationForTests } from "./invalidation";
import { resetDedupMetrics } from "./metrics";
import { resetMutationQueueForTests } from "./mutation-queue";
import { resetSyncStatusForTests } from "./sync-status";

/** Reset all data-layer singletons. Called from vitest.setup.ts. */
export function resetDataLayerForTests(): void {
  resetDataLayerConfig();
  resetDedupMetrics();
  resetCacheForTests();
  resetDedupForTests();
  resetInvalidationForTests();
  resetMutationQueueForTests();
  resetSyncStatusForTests();
  resetConnectivityForTests(true);
  resetClientForTests();
}
