"use client";

/**
 * useVerificationStatus — Issue #925
 *
 * Single-project verification status fetch backed by SWR.
 *
 * Every component that needs the status for the same projectId (ProjectCard,
 * ProjectDetailPage, RecentlyViewedProjects, ProjectStatusBanner, …) hits the
 * same SWR cache entry.  SWR deduplicates concurrent requests automatically:
 * the first mount triggers one fetch; every subsequent mount within the
 * dedupingInterval receives the cached value with zero extra network calls.
 *
 * Cache key:  "verification-{projectId}"
 * TTL:        5 minutes  (refreshInterval)
 * Dedup:      60 seconds (dedupingInterval)
 * Focus revalidation: enabled (inherits SWRProvider global config)
 *
 * Usage:
 *   const { status, isLoading, error } = useVerificationStatus(project.id);
 *
 * Pass null/undefined to skip fetching (e.g. while the project ID is not yet
 * known); the hook returns { status: null, isLoading: false, error: null }.
 */

import useSWR from "swr";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";
import { verificationStatusCache } from "@/lib/project-cache";

// ─── SWR key factory ──────────────────────────────────────────────────────
// Using a namespaced string key means every consumer across the whole React
// tree shares the same SWR cache entry for a given projectId.

export function verificationSWRKey(projectId: string | null | undefined): string | null {
  return projectId ? `verification-${projectId}` : null;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────

async function fetchVerificationStatus(key: string): Promise<VerificationStatus> {
  // key is "verification-{projectId}"
  const projectId = key.slice("verification-".length);

  // Check the in-memory project cache first (populated by prior batch fetches
  // or earlier per-project loads).  This avoids a Soroban RPC call when the
  // batch on the discover page has already primed the cache.
  const cached = verificationStatusCache.get(projectId);
  if (cached !== undefined) return cached;

  const { sorobanService } = await import("@/services/stellar/soroban.service");
  const status = await sorobanService.getVerificationStatus(projectId);

  // Write back so sibling hooks and batch calls skip the fetch too.
  verificationStatusCache.set(projectId, status);
  return status;
}

// ─── SWR options ─────────────────────────────────────────────────────────
// These are intentionally consistent with the existing useVerificationStatuses
// options so the two hooks use the same effective policy.

const SWR_OPTIONS = {
  /** Background refresh every 5 minutes. */
  refreshInterval: 300_000,
  /** Revalidate when the tab regains focus (e.g. after a wallet interaction). */
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  /** Collapse concurrent requests for the same key into one network call. */
  dedupingInterval: 60_000,
  /** Throttle focus events so rapid tab switches don't pile up. */
  focusThrottleInterval: 10_000,
  shouldRetryOnError: true,
  /** Keep showing the stale value while revalidating — no flash to null. */
  revalidateIfStale: true,
} as const;

// ─── Return type ─────────────────────────────────────────────────────────

export interface UseVerificationStatusResult {
  /**
   * The current verification status.  `null` while loading or when projectId
   * was not provided.  Never throws — errors are surfaced via `error`.
   */
  status: VerificationStatus | null;
  /** True during the initial load only (not during background revalidation). */
  isLoading: boolean;
  /**
   * True while a fetch or revalidation is in flight.  Use this to show a
   * subtle refresh indicator without hiding already-loaded data.
   */
  isValidating: boolean;
  /** Set when the fetch fails.  `null` on success. */
  error: Error | null;
  /** Trigger a manual revalidation (e.g. after an admin status change). */
  refresh: () => Promise<VerificationStatus | undefined>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useVerificationStatus(
  projectId: string | null | undefined,
): UseVerificationStatusResult {
  const key = verificationSWRKey(projectId);

  const { data, error, isLoading, isValidating, mutate } = useSWR<VerificationStatus, Error>(
    key,
    fetchVerificationStatus,
    SWR_OPTIONS,
  );

  // Keep the in-memory cache warm whenever SWR delivers fresh data.
  if (data !== undefined && projectId) {
    verificationStatusCache.set(projectId, data);
  }

  return {
    status: data ?? null,
    isLoading,
    isValidating,
    error: error ?? null,
    refresh: () => mutate(),
  };
}
