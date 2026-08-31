"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseAsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for async data fetching with automatic cleanup.
 *
 * Eliminates the repeated `isMountedRef` / `let cancelled` / `AbortController`
 * boilerplate found across the codebase.
 *
 * @param fetcher - Async function that returns the data.
 * @param deps - Dependency array controlling when to re-fetch.
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useAsyncData(
 *   async () => sorobanService.getVerificationStatus(projectId),
 *   [projectId]
 * );
 * ```
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
): UseAsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) setData(result);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}
