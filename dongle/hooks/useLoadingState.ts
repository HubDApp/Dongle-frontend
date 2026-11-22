"use client";

/**
 * useLoadingState
 *
 * Standardises the three-state (loading / error / ready) pattern used across
 * every SWR-backed component in Dongle.
 *
 * Usage
 * ─────
 *   const { data, error, isLoading } = useSWR(key, fetcher);
 *   const state = useLoadingState({ isLoading, error, hasData: !!data });
 *
 *   if (state === "loading") return <Skeleton />;
 *   if (state === "error")   return <ErrorMessage />;
 *   // state === "ready"
 *
 * State machine
 * ─────────────
 *   "loading"  — initial fetch in progress (isLoading === true, no data yet)
 *   "error"    — fetch failed and there is no cached data to fall back on
 *   "ready"    — data is available (may be stale while revalidating in the
 *                background; the component should still render, not show a
 *                spinner, because SWR's stale-while-revalidate is the point)
 *
 * Note: when SWR is revalidating *after* a successful initial fetch (i.e.
 * isValidating is true but data already exists), the state stays "ready".
 * Components that want to show a subtle refresh indicator should check
 * isValidating directly on the useSWR return value.
 */

export type LoadingPhase = "loading" | "error" | "ready";

export interface UseLoadingStateInput {
  /** True when SWR is on its initial fetch and no cached value exists yet. */
  isLoading: boolean;
  /** Error from the last fetch attempt, or null/undefined if none. */
  error?: Error | null | unknown;
  /**
   * Whether the hook currently holds usable data.
   * Pass `!!data` from your useSWR call.
   */
  hasData: boolean;
}

export function useLoadingState({
  isLoading,
  error,
  hasData,
}: UseLoadingStateInput): LoadingPhase {
  // If we have data, always render even if there is a background error.
  // SWR will keep retrying; we don't want to flash an error over valid cache.
  if (hasData) return "ready";

  // No data yet and an error was thrown — surface the error state.
  if (error) return "error";

  // No data, no error — initial fetch is in progress.
  if (isLoading) return "loading";

  // Key is null/undefined (SWR is conditionally disabled).
  // Treat as loading so the caller shows a skeleton rather than blank content.
  return "loading";
}
