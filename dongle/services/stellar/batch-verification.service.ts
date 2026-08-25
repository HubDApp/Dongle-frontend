/**
 * Batch verification-status fetch with caching.
 *
 * Replaces the N+1 pattern on the discover page:
 *   - Old: Promise.all(projects.map(p => getVerificationStatus(p.id)))
 *     → one serial-through-Promise.all call per project, no caching.
 *   - New: batchFetchVerificationStatuses(projects.map(p => p.id))
 *     → checks cache first, fires a single concurrent wave for misses,
 *       logs elapsed time.
 *
 * The underlying transport is still per-ID for now (the Soroban verification
 * service doesn't expose a multi-ID endpoint yet), but the cache layer means
 * only cold cache pays the per-call cost.
 */

import { verificationStatusCache } from "@/lib/project-cache";
import { logger } from "@/lib/logger";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";

/** How many verification status fetches to fire in parallel per wave. */
const CONCURRENCY = 20;

/**
 * Fetch verification statuses for a list of project IDs, backed by a
 * 1-minute cache.
 *
 * @param ids          Project IDs to check.
 * @param signal       Optional AbortSignal to cancel in-flight requests.
 * @param bypassCache  When true, re-fetch even for cached IDs.
 * @returns            Record mapping each ID to its VerificationStatus.
 */
export async function batchFetchVerificationStatuses(
  ids: string[],
  signal?: AbortSignal,
  bypassCache = false,
): Promise<Record<string, VerificationStatus>> {
  if (ids.length === 0) return {};

  const startMs = Date.now();
  const result: Record<string, VerificationStatus> = {};

  // --- 1. Serve cached entries ---
  const toFetch: string[] = bypassCache
    ? [...ids]
    : verificationStatusCache.getMissingKeys(ids);

  if (!bypassCache) {
    for (const id of ids) {
      const cached = verificationStatusCache.get(id);
      if (cached !== undefined) {
        result[id] = cached;
      }
    }
  }

  const cacheHitCount = ids.length - toFetch.length;
  if (cacheHitCount > 0) {
    logger.debug(
      `[BatchVerification] Cache hit for ${cacheHitCount}/${ids.length} statuses`,
    );
  }

  if (toFetch.length === 0) {
    logger.info(
      `[BatchVerification] All ${ids.length} statuses served from cache in ${Date.now() - startMs}ms`,
    );
    return result;
  }

  if (signal?.aborted) {
    logger.debug("[BatchVerification] Aborted before fetching");
    return result;
  }

  // --- 2. Lazy-import the soroban service to avoid circular deps ---
  const { sorobanService } = await import(
    "@/services/stellar/soroban.service"
  );

  // --- 3. Fan-out in waves of CONCURRENCY to avoid flooding the RPC ---
  logger.debug(
    `[BatchVerification] Fetching ${toFetch.length} statuses (concurrency: ${CONCURRENCY})`,
  );

  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    if (signal?.aborted) {
      logger.debug("[BatchVerification] Aborted mid-fetch");
      break;
    }

    const wave = toFetch.slice(i, i + CONCURRENCY);
    const waveResults = await Promise.allSettled(
      wave.map(async (id): Promise<[string, VerificationStatus]> => {
        const status = await sorobanService.getVerificationStatus(id, signal);
        return [id, status];
      }),
    );

    for (const outcome of waveResults) {
      if (outcome.status === "fulfilled") {
        const [id, status] = outcome.value;
        result[id] = status;
        verificationStatusCache.set(id, status);
      } else {
        // reason.reason is the rejection; id is lost here so we use index
        logger.error(
          "[BatchVerification] Status fetch failed:",
          outcome.reason,
        );
      }
    }
  }

  // Fill in fallback "NONE" for any IDs that failed to resolve
  for (const id of toFetch) {
    if (!(id in result)) {
      result[id] = "NONE";
    }
  }

  const elapsed = Date.now() - startMs;
  logger.info(
    `[BatchVerification] Fetched ${toFetch.length} statuses (${cacheHitCount} from cache) in ${elapsed}ms`,
  );

  return result;
}
