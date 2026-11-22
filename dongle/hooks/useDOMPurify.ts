"use client";

/**
 * useDOMPurify — Issue #924
 *
 * Lazy-loads DOMPurify only when a component actually needs to sanitize
 * user-generated content (project descriptions, review comments, etc.).
 *
 * Pages that never call sanitize() skip the ~50 KB bundle entirely.
 *
 * Usage:
 *   const { sanitize, isReady } = useDOMPurify();
 *   const clean = sanitize('<b>hello</b><script>alert(1)</script>');
 *   // → '<b>hello</b>'  once ready; returns '' while loading or on error.
 *
 * The import is cached at the module level so the dynamic import fires at most
 * once per page, regardless of how many components call this hook.
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Module-level cache ────────────────────────────────────────────────────
// Shared across all hook instances — DOMPurify is loaded once per page.

type DOMPurifyType = typeof import("dompurify").default;

/** Cached module reference after first successful load. */
let cachedModule: DOMPurifyType | null = null;

/** In-flight promise so concurrent mounts share a single import() call. */
let loadingPromise: Promise<DOMPurifyType> | null = null;

async function loadDOMPurify(): Promise<DOMPurifyType> {
  if (cachedModule) return cachedModule;

  if (!loadingPromise) {
    loadingPromise = import("dompurify").then((mod) => {
      const purify = (mod as any).default ?? mod;
      cachedModule = purify as DOMPurifyType;
      return cachedModule;
    });
  }

  return loadingPromise;
}

// ─── Default sanitization configs ─────────────────────────────────────────

/** Safe rich-text tags allowed in project descriptions and review content. */
export const RICH_TEXT_CONFIG: import("dompurify").Config = {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "code", "pre", "a", "p", "ul", "ol", "li", "br", "h1", "h2", "h3", "blockquote"],
  ALLOWED_ATTR: ["href", "target", "rel"],
};

/** Strip all tags — useful for plain-text contexts (e.g. URL strings, metadata). */
export const PLAIN_TEXT_CONFIG: import("dompurify").Config = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
};

// ─── Hook ──────────────────────────────────────────────────────────────────

export interface UseDOMPurifyResult {
  /**
   * Sanitizes a string using DOMPurify.
   *
   * - If the module has loaded, runs synchronously and returns a clean string.
   * - If called before the module is ready, returns `''` (empty string) so
   *   callers should gate on `isReady` or handle the empty case.
   * - If the import fails, logs the error and returns `''` (graceful fallback).
   *
   * @param dirty  Raw HTML or text to sanitize.
   * @param config DOMPurify config. Defaults to PLAIN_TEXT_CONFIG.
   */
  sanitize: (dirty: string, config?: import("dompurify").Config) => string;

  /** True once the DOMPurify module has been imported and is ready to use. */
  isReady: boolean;

  /** Set when the dynamic import fails. The hook remains safe to call. */
  error: Error | null;
}

export function useDOMPurify(): UseDOMPurifyResult {
  // If the module is already cached (from a prior mount), start ready.
  const [isReady, setIsReady] = useState<boolean>(() => cachedModule !== null);
  const [error, setError] = useState<Error | null>(null);

  // Keep a stable ref so the sanitize callback doesn't re-create on every
  // render while isReady transitions from false → true.
  const moduleRef = useRef<DOMPurifyType | null>(cachedModule);

  useEffect(() => {
    // Already loaded from cache — nothing to do.
    if (moduleRef.current) return;

    let cancelled = false;

    loadDOMPurify()
      .then((purify) => {
        if (cancelled) return;
        moduleRef.current = purify;
        setIsReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("[useDOMPurify] Failed to load DOMPurify:", error);
        setError(error);
        // isReady stays false; sanitize() will return '' as a safe fallback.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sanitize = useCallback(
    (dirty: string, config: import("dompurify").Config = PLAIN_TEXT_CONFIG): string => {
      if (!moduleRef.current) {
        // Module not yet loaded or failed — return empty string as safe fallback.
        return "";
      }
      try {
        return moduleRef.current.sanitize(dirty, config) as string;
      } catch (err) {
        console.error("[useDOMPurify] sanitize() threw unexpectedly:", err);
        return "";
      }
    },
    // moduleRef is a stable ref — intentionally not in the dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { sanitize, isReady, error };
}
