/**
 * Batch project metadata fetch with caching.
 *
 * Solves the N+1 problem on the discover page by:
 * 1. Checking the in-memory cache for already-fetched projects.
 * 2. Splitting uncached IDs into chunks of at most BATCH_SIZE (100).
 * 3. Fetching each chunk concurrently via the active IProjectRepository.
 * 4. Populating the cache with results so the next call within the TTL is free.
 * 5. Logging elapsed time so performance improvements are visible.
 */

import type { Project } from "@/types/project";
import { registry } from "@/services/data-access/registry";
import { projectMetaCache } from "@/lib/project-cache";
import { logger } from "@/lib/logger";

/** Maximum project IDs to request in a single batch. */
export const BATCH_SIZE = 100;

/**
 * Fetch multiple projects by their IDs in batches, backed by a 1-minute cache.
 *
 * @param ids          List of project IDs to fetch.
 * @param bypassCache  When true, ignore the cache and always hit the repository.
 * @returns            Record mapping each requested ID to its Project (or null
 *                     when the project was not found).
 */
export async function batchFetchProjects(
  ids: string[],
  bypassCache = false,
): Promise<Record<string, Project | null>> {
  if (ids.length === 0) return {};

  const startMs = Date.now();
  const result: Record<string, Project | null> = {};

  // --- 1. Serve what the cache already has ---
  const toFetch: string[] = bypassCache
    ? [...ids]
    : projectMetaCache.getMissingKeys(ids);

  if (!bypassCache) {
    for (const id of ids) {
      const cached = projectMetaCache.get(id);
      if (cached !== undefined) {
        result[id] = cached;
      }
    }
  }

  const cacheHitCount = ids.length - toFetch.length;
  if (cacheHitCount > 0) {
    logger.debug(
      `[BatchFetch] Cache hit for ${cacheHitCount}/${ids.length} projects`,
    );
  }

  if (toFetch.length === 0) {
    logger.info(
      `[BatchFetch] All ${ids.length} projects served from cache in ${Date.now() - startMs}ms`,
    );
    return result;
  }

  // --- 2. Split remaining IDs into chunks of BATCH_SIZE ---
  const chunks: string[][] = [];
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    chunks.push(toFetch.slice(i, i + BATCH_SIZE));
  }

  logger.debug(
    `[BatchFetch] Fetching ${toFetch.length} projects in ${chunks.length} batch(es) of up to ${BATCH_SIZE}`,
  );

  // --- 3. Fetch all chunks concurrently ---
  const chunkResults = await Promise.allSettled(
    chunks.map((chunk) => fetchChunk(chunk)),
  );

  // --- 4. Merge results and populate cache ---
  for (const outcome of chunkResults) {
    if (outcome.status === "fulfilled") {
      for (const [id, project] of Object.entries(outcome.value)) {
        result[id] = project;
        if (project !== null) {
          projectMetaCache.set(id, project);
        }
      }
    } else {
      logger.error("[BatchFetch] Chunk fetch failed:", outcome.reason);
    }
  }

  // Ensure every requested ID has an entry (null for misses)
  for (const id of toFetch) {
    if (!(id in result)) {
      result[id] = null;
    }
  }

  const elapsed = Date.now() - startMs;
  logger.info(
    `[BatchFetch] Fetched ${toFetch.length} projects (${cacheHitCount} from cache) in ${elapsed}ms`,
  );

  return result;
}

/**
 * Fetch a single chunk of project IDs from the active repository.
 * Falls back to individual getById calls if the repository does not
 * expose a bulk method (future-proofing for real on-chain indexers).
 */
async function fetchChunk(
  ids: string[],
): Promise<Record<string, Project | null>> {
  const repo = registry.projects;

  // If the repository exposes a bulk getByIds method, prefer it.
  if (typeof (repo as { getByIds?: unknown }).getByIds === "function") {
    const bulkRepo = repo as {
      getByIds(ids: string[]): Promise<Project[]>;
    };
    const projects = await bulkRepo.getByIds(ids);
    const byId: Record<string, Project | null> = Object.fromEntries(
      ids.map((id) => [id, null]),
    );
    for (const p of projects) {
      byId[p.id] = p;
    }
    return byId;
  }

  // Fallback: parallel individual fetches within the chunk.
  const entries = await Promise.all(
    ids.map(async (id): Promise<[string, Project | null]> => {
      try {
        const project = await repo.getById(id);
        return [id, project];
      } catch (err) {
        logger.error(`[BatchFetch] Failed to fetch project ${id}:`, err);
        return [id, null];
      }
    }),
  );

  return Object.fromEntries(entries);
}
