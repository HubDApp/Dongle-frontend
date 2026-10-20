/**
 * useFieldSearchReplace
 *
 * Provides search-and-replace functionality for a single form text field.
 * - Opens/closes via keyboard shortcut (Ctrl/Cmd+H).
 * - Finds all match positions in the current value.
 * - Navigates between matches (next/prev).
 * - Replaces the current match or all matches.
 * - Optional case-sensitive search.
 *
 * Issue #519 – Build form field search and replace
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchMatch {
  start: number;
  end: number;
}

export interface UseFieldSearchReplaceOptions {
  /** Current value of the field being searched. */
  value: string;
  /**
   * Called when the value changes due to a replace operation.
   * The caller is responsible for updating their controlled state.
   */
  onChange: (newValue: string) => void;
}

export interface UseFieldSearchReplaceResult {
  /** Whether the search/replace panel is currently open. */
  isOpen: boolean;
  /** Open the panel. */
  open: () => void;
  /** Close the panel (clears search state). */
  close: () => void;
  /** Current search query. */
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  /** Current replace text. */
  replaceText: string;
  setReplaceText: (t: string) => void;
  /** Whether the search is case-sensitive. */
  caseSensitive: boolean;
  setCaseSensitive: (v: boolean) => void;
  /** All current match positions. */
  matches: SearchMatch[];
  /** Index of the currently highlighted match (0-based), or -1 if none. */
  currentMatchIndex: number;
  /** Move to the next match. */
  nextMatch: () => void;
  /** Move to the previous match. */
  prevMatch: () => void;
  /** Replace the currently highlighted match. */
  replaceCurrent: () => void;
  /** Replace all matches at once. */
  replaceAll: () => void;
  /**
   * onKeyDown handler to attach to the input/textarea.
   * Intercepts Ctrl/Cmd+H to toggle the panel.
   */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

// ---------------------------------------------------------------------------
// Helper: find all non-overlapping matches
// ---------------------------------------------------------------------------

function findMatches(text: string, query: string, caseSensitive: boolean): SearchMatch[] {
  if (!query) return [];

  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const results: SearchMatch[] = [];

  let from = 0;
  while (from < haystack.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    results.push({ start: idx, end: idx + needle.length });
    from = idx + needle.length;
  }

  return results;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFieldSearchReplace(
  options: UseFieldSearchReplaceOptions
): UseFieldSearchReplaceResult {
  const { value, onChange } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQueryState] = useState("");
  const [replaceText, setReplaceTextState] = useState("");
  const [caseSensitive, setCaseSensitiveState] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Keep onChange stable
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // -----------------------------------------------------------------------
  // Derived: all current matches
  // -----------------------------------------------------------------------
  const matches = findMatches(value, searchQuery, caseSensitive);

  // Clamp currentMatchIndex when matches change
  const safeIndex =
    matches.length === 0 ? -1 : Math.min(currentMatchIndex, matches.length - 1);

  // -----------------------------------------------------------------------
  // Panel open/close
  // -----------------------------------------------------------------------

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQueryState("");
    setReplaceTextState("");
    setCurrentMatchIndex(0);
  }, []);

  // -----------------------------------------------------------------------
  // Search controls
  // -----------------------------------------------------------------------

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q);
    setCurrentMatchIndex(0);
  }, []);

  const setReplaceText = useCallback((t: string) => setReplaceTextState(t), []);

  const setCaseSensitive = useCallback((v: boolean) => {
    setCaseSensitiveState(v);
    setCurrentMatchIndex(0);
  }, []);

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const prevMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  // -----------------------------------------------------------------------
  // Replace operations
  // -----------------------------------------------------------------------

  const replaceCurrent = useCallback(() => {
    if (safeIndex === -1) return;
    const match = matches[safeIndex];
    const newValue =
      value.slice(0, match.start) + replaceText + value.slice(match.end);
    onChangeRef.current(newValue);
    // Stay on same index (it now points at the next occurrence, or clamped)
  }, [safeIndex, matches, value, replaceText]);

  const replaceAll = useCallback(() => {
    if (!searchQuery) return;

    const flags = caseSensitive ? "g" : "gi";
    // Escape the query to use as a literal regex search
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, flags);
    const newValue = value.replace(regex, replaceText);
    onChangeRef.current(newValue);
    setCurrentMatchIndex(0);
  }, [searchQuery, caseSensitive, value, replaceText]);

  // -----------------------------------------------------------------------
  // Keyboard shortcut
  // -----------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlOrCmd && e.key === "h") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    },
    []
  );

  return {
    isOpen,
    open,
    close,
    searchQuery,
    setSearchQuery,
    replaceText,
    setReplaceText,
    caseSensitive,
    setCaseSensitive,
    matches,
    currentMatchIndex: safeIndex,
    nextMatch,
    prevMatch,
    replaceCurrent,
    replaceAll,
    handleKeyDown,
  };
}
