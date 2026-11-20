"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Search, Star, X } from "lucide-react";
import { projectService } from "@/services/project/project.service";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

const RECENT_KEY = "dongle_recent_searches";
const MAX_RECENT = 5;
const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 5;

function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  const t = term.trim();
  if (t.length < MIN_CHARS) return;
  try {
    const next = [t, ...readRecent().filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

type Item = { kind: "project"; project: Project } | { kind: "recent"; term: string };

export function SearchAutocomplete({ value, onChange, onClear, placeholder }: SearchAutocompleteProps) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [debounced, setDebounced] = useState(value);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const items: Item[] = useMemo(() => {
    const q = debounced.trim();
    if (!q) return recent.map((term) => ({ kind: "recent" as const, term }));
    if (q.length < MIN_CHARS) return [];
    return projectService
      .searchProjects(q)
      .slice(0, MAX_RESULTS)
      .map((project) => ({ kind: "project" as const, project }));
  }, [debounced, recent]);

  useEffect(() => setActive(-1), [items]);

  const select = (item: Item) => {
    setOpen(false);
    if (item.kind === "recent") {
      onChange(item.term);
      pushRecent(item.term);
      return;
    }
    pushRecent(value);
    track("search_suggestion_select", { projectId: item.project.id });
    router.push(`/projects/${item.project.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (!items.length) return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + dir + items.length) % items.length);
      return;
    }
    if (e.key === "Enter") {
      if (open && active >= 0 && items[active]) {
        e.preventDefault();
        select(items[active]);
      } else {
        pushRecent(value);
        setOpen(false);
      }
    }
  };

  const showDropdown = open && items.length > 0;

  return (
    <div ref={rootRef} className="flex-1 w-full lg:w-auto relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
      <input
        type="search"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={placeholder}
        className="w-full pl-12 pr-11 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        value={value}
        onFocus={() => {
          setRecent(readRecent());
          setOpen(true);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-2"
        >
          {!debounced.trim() && (
            <li className="px-4 pb-1 text-xs font-semibold uppercase text-zinc-400" aria-hidden>
              Recent searches
            </li>
          )}
          {items.map((item, i) => (
            <li
              key={item.kind === "project" ? item.project.id : item.term}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(item)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 sm:py-2 cursor-pointer",
                i === active && "bg-zinc-100 dark:bg-zinc-800",
              )}
            >
              {item.kind === "recent" ? (
                <>
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="text-sm truncate">{item.term}</span>
                </>
              ) : (
                <>
                  {item.project.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.project.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {item.project.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{item.project.name}</span>
                    <span className="block text-xs text-zinc-500 truncate">{item.project.primaryCategory}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    {item.project.rating.toFixed(1)}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchAutocomplete;
