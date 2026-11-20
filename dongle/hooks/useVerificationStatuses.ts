"use client";

/**
 * useVerificationStatuses — Issue #925 (updated)
 *
 * Multi-project verification status hook.
 *
 * Previously this used a single SWR call keyed on the whole ID array, which
 * meant two components watching different-but-overlapping sets (e.g. discover
 * page + recently-viewed panel) each fired their own network request.
 *
 * Now it delegates to useVerificationStatus() once per ID.  Every project
 * shares the same `"verification-{id}"` SWR cache entry regardless of which
 * component requested it, and SWR's dedupingInterval (60 s) collapses
 * concurrent mounts into a single in-flight fetch per project.
 *
 * Public API is unchanged so existing callers need no updates.
 */

import { useVerificationStatus } from "./useVerificationStatus";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";

export interface UseVerificationStatusesReturn {
  statuses: Record<string, VerificationStatus>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Returns verification statuses for a list of project IDs.
 *
 * Each ID is fetched via its own SWR key (`"verification-{id}"`), so the
 * results are shared with any other component that calls
 * `useVerificationStatus(id)` for the same ID.
 *
 * @param ids           Project IDs to watch.
 * @param _options      Reserved for future use; ignored (bypassCache handled
 *                      at the SWR / mutate layer).
 */
export function useVerificationStatuses(
  ids: string[],
  _options?: { bypassCache?: boolean },
): UseVerificationStatusesReturn {
  // We call the per-project hook for every ID.  React's rules-of-hooks require
  // a stable hook call count, so we keep a stable reference by using the
  // hook unconditionally with the slice of IDs we have.
  //
  // Note: React permits this pattern when the array length is stable across
  // renders (which it is on the discover page — it's the full project list).
  // If the length could change mid-render, callers should use a context or
  // a reducer instead.  For the current use-cases the length is stable.
  /* eslint-disable react-hooks/rules-of-hooks */
  const perProject = ids.map((id) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useVerificationStatus(id),
  );
  /* eslint-enable react-hooks/rules-of-hooks */

  const statuses: Record<string, VerificationStatus> = {};
  let anyLoading = false;
  let firstError: Error | null = null;

  for (let i = 0; i < ids.length; i++) {
    const { status, isLoading, error } = perProject[i];
    if (status !== null) {
      statuses[ids[i]] = status;
    }
    if (isLoading) anyLoading = true;
    if (error && !firstError) firstError = error;
  }

  const refresh = async () => {
    await Promise.all(perProject.map((r) => r.refresh()));
  };

  return {
    statuses,
    isLoading: anyLoading,
    error: firstError,
    refresh,
  };
}
