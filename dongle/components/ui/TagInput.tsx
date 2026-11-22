import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  error?: string;
  id?: string;
  suggestionsEnabled?: boolean;
  maxTags?: number;
  maxTagLength?: number;
}

type TagSuggestion = { tag: string; usageCount: number };

export const DEFAULT_MAX_TAG_LENGTH = 30;

/** Subsequence fuzzy match: "dfi" matches "defi". */
export function fuzzyMatch(tag: string, query: string): boolean {
  if (!query) return true;
  const target = tag.toLowerCase();
  if (target.includes(query)) return true;
  let position = 0;
  for (const char of target) {
    if (char === query[position]) position += 1;
    if (position === query.length) return true;
  }
  return false;
}

export function TagInput({
  label,
  tags,
  onChange,
  placeholder = "Type and press enter...",
  error,
  id,
  suggestionsEnabled = false,
  maxTags = Infinity,
  maxTagLength = DEFAULT_MAX_TAG_LENGTH,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pendingCreate, setPendingCreate] = useState<string | null>(null);
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const listId = `${inputId}-suggestions`;
  const normalizedQuery = inputValue.trim().toLowerCase();
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const tagRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (!suggestionsEnabled || !isFocused) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/tags?q=${encodeURIComponent(normalizedQuery)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          if (Array.isArray(payload?.data?.suggestions)) {
            setSuggestions(payload.data.suggestions.filter(
              (item: unknown): item is TagSuggestion =>
                !!item && typeof item === "object" &&
                typeof (item as TagSuggestion).tag === "string" &&
                typeof (item as TagSuggestion).usageCount === "number",
            ));
          }
        })
        .catch(() => {});
    }, 120);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isFocused, normalizedQuery, suggestionsEnabled]);

  const visibleSuggestions = useMemo(() => {
    let recent: string[] = [];
    if (suggestionsEnabled && typeof window !== "undefined") {
      try {
        const stored: unknown = JSON.parse(window.localStorage.getItem("dongle:recent-tags") || "[]");
        if (Array.isArray(stored)) recent = stored.filter((tag): tag is string => typeof tag === "string");
      } catch {
        recent = [];
      }
    }
    const recentOrder = new Map(recent.map((tag, index) => [tag.toLowerCase(), index]));
    const available = new Map(suggestions.map((item) => [item.tag.toLowerCase(), item]));
    for (const tag of recent) {
      if (fuzzyMatch(tag, normalizedQuery)) {
        if (!available.has(tag.toLowerCase())) available.set(tag.toLowerCase(), { tag, usageCount: 0 });
      }
    }
    return [...available.values()]
      .filter(({ tag }) => fuzzyMatch(tag, normalizedQuery))
      .filter(({ tag }) => !tags.some((current) => current.toLowerCase() === tag.toLowerCase()))
      .sort((left, right) => {
        const leftRecent = recentOrder.get(left.tag.toLowerCase());
        const rightRecent = recentOrder.get(right.tag.toLowerCase());
        if (leftRecent !== undefined || rightRecent !== undefined) {
          return (leftRecent ?? Infinity) - (rightRecent ?? Infinity);
        }
        return right.usageCount - left.usageCount;
      })
      .slice(0, 8);
  }, [normalizedQuery, suggestions, suggestionsEnabled, tags]);

  const addTag = (value: string) => {
    const newTag = value.trim().slice(0, maxTagLength).toLowerCase();
    if (!newTag || tags.length >= maxTags || tags.some((tag) => tag.toLowerCase() === newTag)) return;
    onChange([...tags, newTag]);
    if (suggestionsEnabled && typeof window !== "undefined") {
      try {
        const stored: unknown = JSON.parse(window.localStorage.getItem("dongle:recent-tags") || "[]");
        const recent = Array.isArray(stored) ? stored.filter((tag): tag is string => typeof tag === "string") : [];
        window.localStorage.setItem("dongle:recent-tags", JSON.stringify([
          newTag,
          ...recent.filter((tag) => tag.toLowerCase() !== newTag),
        ].slice(0, 20)));
      } catch {
        // Tag entry should still work when browser storage is unavailable.
      }
    }
    setInputValue("");
    setActiveIndex(-1);
    setPendingCreate(null);
  };

  const isExisting = (value: string) =>
    visibleSuggestions.some(({ tag }) => tag.toLowerCase() === value.trim().toLowerCase());

  /** New tags (not in suggestions) need a second confirmation when suggestions are on. */
  const submitValue = (value: string) => {
    const candidate = value.trim().slice(0, maxTagLength).toLowerCase();
    if (!candidate) return;
    if (suggestionsEnabled && !isExisting(candidate) && pendingCreate !== candidate) {
      setPendingCreate(candidate);
      return;
    }
    addTag(candidate);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const optionCount = visibleSuggestions.length;
    if (suggestionsEnabled && e.key === "ArrowDown" && optionCount > 0) {
      e.preventDefault();
      setActiveIndex((index) => (index + 1) % optionCount);
    } else if (suggestionsEnabled && e.key === "ArrowUp" && optionCount > 0) {
      e.preventDefault();
      setActiveIndex((index) => (index <= 0 ? optionCount - 1 : index - 1));
    } else if (e.key === "Escape") {
      setActiveIndex(-1);
      setPendingCreate(null);
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const active = visibleSuggestions[activeIndex];
      if (active) {
        addTag(active.tag);
        return;
      }
      const match = visibleSuggestions.find(({ tag }) => tag.toLowerCase() === normalizedQuery);
      if (match) addTag(match.tag);
      else submitValue(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, index: number) => {
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      const tag = tags[index];
      if (tag === undefined) return;
      const focusIndex = index > 0 ? index - 1 : 0;
      removeTag(tag);
      setActiveTagIndex(focusIndex);
      window.setTimeout(() => {
        tagRefs.current[focusIndex]?.focus();
      }, 0);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = index > 0 ? index - 1 : tags.length - 1;
      setActiveTagIndex(nextIndex);
      tagRefs.current[nextIndex]?.focus();
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = index < tags.length - 1 ? index + 1 : 0;
      setActiveTagIndex(nextIndex);
      tagRefs.current[nextIndex]?.focus();
    }
  };

  const activeIndex = Math.min(activeTagIndex, Math.max(tags.length - 1, 0));

  return (
    <div className="flex flex-col gap-2 w-full">
      <label htmlFor={inputId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="relative">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl transition-all",
          error
            ? "border-red-500/50 focus-within:border-red-500"
            : "border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20"
        )}
      >
        {tags.length > 0 && (
          <ul
            role="listbox"
            aria-label={`Selected ${label}`}
            data-keyboard="true"
            className="flex min-w-0 flex-wrap items-center gap-2"
          >
            {tags.map((tag, index) => (
              <li
                key={tag}
                role="option"
                ref={(element) => {
                  tagRefs.current[index] = element;
                }}
                tabIndex={index === activeIndex ? 0 : -1}
                aria-selected={index === activeIndex}
                onFocus={() => setActiveTagIndex(index)}
                onKeyDown={(event) => handleTagKeyDown(event, index)}
                className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 pl-3 pr-1.5 py-1 rounded-full text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900"
              >
                {tag}
                <span
                  aria-hidden="true"
                  onClick={() => removeTag(tag)}
                  className="flex cursor-pointer items-center rounded-full p-0.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
                >
                  <X className="w-3 h-3" />
                </span>
              </li>
            ))}
          </ul>
        )}
        <input
          id={inputId}
          type="text"
          value={inputValue}
          maxLength={maxTagLength === Infinity ? undefined : maxTagLength}
          onChange={(e) => {
            setInputValue(e.target.value);
            setActiveIndex(-1);
            setPendingCreate(null);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-expanded={suggestionsEnabled && isFocused && visibleSuggestions.length > 0}
          aria-controls={suggestionsEnabled ? listId : undefined}
          role={suggestionsEnabled ? "combobox" : undefined}
          aria-autocomplete={suggestionsEnabled ? "list" : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 min-w-[120px]"
        />
      </div>
      {suggestionsEnabled && isFocused && (visibleSuggestions.length > 0 || normalizedQuery) && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {visibleSuggestions.map(({ tag, usageCount }, index) => (
            <li key={tag} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => addTag(tag)} className={cn("flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800", index === activeIndex && "bg-zinc-100 dark:bg-zinc-800")}>
                <span>{tag}</span><span className="text-xs text-zinc-500">{usageCount} projects</span>
              </button>
            </li>
          ))}
          {normalizedQuery && !visibleSuggestions.some(({ tag }) => tag.toLowerCase() === normalizedQuery) && (
            <li role="option" aria-selected="false">
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => submitValue(inputValue)} className="w-full rounded px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                {pendingCreate
                  ? `Confirm new tag “${pendingCreate}” (press Enter again)`
                  : `Create “${inputValue.trim().slice(0, maxTagLength)}”`}
              </button>
            </li>
          )}
        </ul>
      )}
      </div>
      {maxTagLength !== Infinity && inputValue.length >= maxTagLength && (
        <span className="text-xs text-zinc-500">Tags can be at most {maxTagLength} characters</span>
      )}
      {tags.length >= maxTags && <span className="text-xs text-zinc-500">Maximum {maxTags} tags</span>}
      {error && (
        <span id={errorId} className="text-xs font-medium text-red-500 ml-1" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
