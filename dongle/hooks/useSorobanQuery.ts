"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  query,
  prefetch,
  getMetrics,
  type SorobanQueryOptions,
  type RpcMetrics,
} from "@/lib/soroban-rpc-hub";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseSorobanQueryOptions<T> extends Omit<SorobanQueryOptions, "signal"> {
  /** Whether to skip the query entirely (useful for conditional fetching). */
  skip?: boolean;
  /**
   * Keys to prefetch when this query mounts. Each entry is a [key, fetcher] pair.
   * The hub will warm the cache proactively so subsequent queries are instant.
   */
  prefetchKeys?: Array<[string, () => Promise<unknown>]>;
}

export interface UseSorobanQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  /** Re-run the query, bypassing the cache. */
  refetch: () => void;
  metrics: RpcMetrics;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * React hook for deduplicated, cached, and cancellable Soroban RPC queries.
 *
 * Features:
 *  - Cancels in-flight query on component unmount via AbortSignal
 *  - Deduplicates identical queries fired within 1 s
 *  - Caches results for `ttlMs` (default 30 s)
 *  - Prefetches sibling keys provided in `prefetchKeys`
 *  - Exposes live performance metrics
 */
export function useSorobanQuery<T>(
  /** Stable cache key — changing it triggers a new fetch. */
  key: string,
  /** Async function that performs the actual RPC call. Must be stable (wrap in useCallback if needed). */
  fetcher: () => Promise<T>,
  options: UseSorobanQueryOptions<T> = {},
): UseSorobanQueryResult<T> {
  const { skip = false, prefetchKeys, ttlMs, bypassCache } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<RpcMetrics>(getMetrics);

  // Tracks the current fetch attempt so stale responses are ignored
  const attemptRef = useRef(0);
  // AbortController for the current in-flight request
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    (forceBypass = false) => {
      if (skip) return;

      // Cancel any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const attempt = ++attemptRef.current;

      setIsLoading(true);
      setError(null);

      query<T>(key, fetcher, {
        ttlMs,
        signal: controller.signal,
        bypassCache: forceBypass || bypassCache,
      })
        .then((result) => {
          if (attempt !== attemptRef.current) return; // stale
          setData(result);
          setMetrics(getMetrics());
        })
        .catch((err: unknown) => {
          if (attempt !== attemptRef.current) return;
          // AbortError on unmount is not an error to surface
          if (err instanceof Error && err.name === "AbortError") return;
          setError(err instanceof Error ? err : new Error(String(err)));
          setMetrics(getMetrics());
        })
        .finally(() => {
          if (attempt !== attemptRef.current) return;
          setIsLoading(false);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, skip, ttlMs, bypassCache],
  );

  // Fire prefetches on mount (best-effort, errors are swallowed inside hub)
  useEffect(() => {
    if (!prefetchKeys?.length) return;
    for (const [pKey, pFetcher] of prefetchKeys) {
      prefetch(pKey, pFetcher, { ttlMs });
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run query whenever the key / skip flag changes
  useEffect(() => {
    execute();
    return () => {
      abortRef.current?.abort();
    };
  }, [execute]);

  const refetch = useCallback(() => execute(true), [execute]);

  return { data, isLoading, error, refetch, metrics };
}
