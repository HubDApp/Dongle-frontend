"use client";

/**
 * FieldSearchReplacePanel
 *
 * A compact search-and-replace panel that floats beneath (or beside) a form
 * field.  Powered by useFieldSearchReplace.
 *
 * Issue #519 – Build form field search and replace
 */

import React, { useEffect, useRef } from "react";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  CaseSensitive,
  Replace,
  ReplaceAll,
} from "lucide-react";
import type { SearchMatch } from "@/hooks/useFieldSearchReplace";

export interface FieldSearchReplacePanelProps {
  /** Whether the panel is visible. */
  isOpen: boolean;
  /** Close callback. */
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  replaceText: string;
  onReplaceTextChange: (t: string) => void;
  caseSensitive: boolean;
  onCaseSensitiveChange: (v: boolean) => void;
  matches: SearchMatch[];
  currentMatchIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  /** Optional id to associate with the field it controls, for accessible labels. */
  fieldId?: string;
}

/**
 * Renders a floating search/replace toolbar panel.
 *
 * Layout:
 *   [🔍 search input] [x/n] [▲▼] [Aa toggle] [✕]
 *   [↩  replace input] [Replace] [Replace All]
 */
export function FieldSearchReplacePanel({
  isOpen,
  onClose,
  searchQuery,
  onSearchQueryChange,
  replaceText,
  onReplaceTextChange,
  caseSensitive,
  onCaseSensitiveChange,
  matches,
  currentMatchIndex,
  onNext,
  onPrev,
  onReplaceCurrent,
  onReplaceAll,
  fieldId,
}: FieldSearchReplacePanelProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search input whenever the panel opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const matchLabel =
    matches.length === 0
      ? "No matches"
      : `${currentMatchIndex + 1} of ${matches.length}`;

  const panelId = fieldId ? `${fieldId}-search-panel` : "field-search-panel";

  return (
    <div
      id={panelId}
      role="search"
      aria-label="Search and replace"
      className="mt-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-md p-3 flex flex-col gap-2 text-sm"
    >
      {/* ── Row 1: Search ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search icon */}
        <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />

        {/* Search input */}
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Find…"
          aria-label="Search term"
          aria-controls={fieldId}
          className="flex-1 min-w-0 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
        />

        {/* Match counter */}
        <span
          aria-live="polite"
          aria-atomic="true"
          className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap shrink-0"
        >
          {searchQuery ? matchLabel : ""}
        </span>

        {/* Previous / Next */}
        <button
          type="button"
          onClick={onPrev}
          disabled={matches.length === 0}
          aria-label="Previous match"
          title="Previous match"
          className="w-6 h-6 inline-flex items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={matches.length === 0}
          aria-label="Next match"
          title="Next match"
          className="w-6 h-6 inline-flex items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {/* Case-sensitive toggle */}
        <button
          type="button"
          onClick={() => onCaseSensitiveChange(!caseSensitive)}
          aria-pressed={caseSensitive}
          aria-label={caseSensitive ? "Case sensitive (on)" : "Case sensitive (off)"}
          title="Toggle case sensitive"
          className={`w-6 h-6 inline-flex items-center justify-center rounded transition-colors ${
            caseSensitive
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
              : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <CaseSensitive className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search and replace"
          title="Close (Esc)"
          className="w-6 h-6 inline-flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* ── Row 2: Replace ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Replace icon (visual alignment placeholder) */}
        <Replace className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />

        {/* Replace input */}
        <input
          type="text"
          value={replaceText}
          onChange={(e) => onReplaceTextChange(e.target.value)}
          placeholder="Replace with…"
          aria-label="Replace text"
          className="flex-1 min-w-0 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
        />

        {/* Replace current */}
        <button
          type="button"
          onClick={onReplaceCurrent}
          disabled={matches.length === 0}
          aria-label="Replace current match"
          title="Replace"
          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700
            text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800
            hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors whitespace-nowrap"
        >
          Replace
        </button>

        {/* Replace all */}
        <button
          type="button"
          onClick={onReplaceAll}
          disabled={matches.length === 0}
          aria-label="Replace all matches"
          title="Replace all"
          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700
            text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800
            hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors whitespace-nowrap inline-flex items-center gap-1"
        >
          <ReplaceAll className="w-3 h-3" aria-hidden="true" />
          All
        </button>
      </div>
    </div>
  );
}
