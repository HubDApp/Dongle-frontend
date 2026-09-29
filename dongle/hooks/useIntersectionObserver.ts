"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseIntersectionObserverResult<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  isIntersecting: boolean;
}

/**
 * Observes when an element enters or leaves the viewport.
 *
 * @param options.threshold — Visibility ratio to trigger (0-1, default 0)
 * @param options.rootMargin — Margin around root (default "0px")
 * @param options.triggerOnce — If true, stops observing after first intersection (default true)
 *
 * @example
 * ```tsx
 * const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
 *   threshold: 0.1,
 * });
 *
 * return (
 *   <div ref={ref}>
 *     {isIntersecting && <HeavyComponent />}
 *   </div>
 * );
 * ```
 */
export function useIntersectionObserver<T extends HTMLElement>(
  options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverResult<T> {
  const {
    threshold = 0,
    rootMargin = "0px",
    triggerOnce = true,
  } = options;

  const nodeRef = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const setRef = useCallback(
    (node: T | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      nodeRef.current = node;

      if (!node) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          const visible = entry.isIntersecting;
          setIsIntersecting(visible);
          if (visible && triggerOnce) {
            observer.disconnect();
          }
        },
        { threshold, rootMargin },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [threshold, rootMargin, triggerOnce],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { ref: setRef as unknown as React.RefObject<T | null>, isIntersecting };
}

/**
 * Returns a ref callback and intersection state for lazy-loading content.
 * Always triggers once (stops observing after first intersection).
 *
 * @example
 * ```tsx
 * const { ref, isIntersecting } = useLazyLoad<HTMLDivElement>();
 *
 * return <div ref={ref}>{isIntersecting && <ExpensiveList />}</div>;
 * ```
 */
export function useLazyLoad<T extends HTMLElement>(
  options: Omit<UseIntersectionObserverOptions, "triggerOnce"> = {},
): UseIntersectionObserverResult<T> {
  return useIntersectionObserver<T>({ triggerOnce: true, ...options });
}
