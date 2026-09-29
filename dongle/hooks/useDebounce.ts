"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Debounces a value by `delay` ms. Returns the debounced value.
 *
 * @example
 * ```tsx
 * const debouncedQuery = useDebounce(searchInput, 300);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface UseDebouncedCallbackOptions {
  delay: number;
}

/**
 * Returns a stable debounced callback. The callback is only invoked after
 * `delay` ms of inactivity.
 *
 * @example
 * ```tsx
 * const debouncedSearch = useDebouncedCallback((query: string) => {
 *   doSearch(query);
 * }, { delay: 300 });
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  { delay }: UseDebouncedCallbackOptions,
): T {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  callbackRef.current = callback;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );

  return debouncedFn as T;
}
