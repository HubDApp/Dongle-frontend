"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Download, Pencil, Trash2, Upload, Check, X } from "lucide-react";
import { savedSearchService } from "@/services/search/saved-search.service";
import { MAX_SAVED_SEARCHES } from "@/constants/limits";
import { track } from "@/lib/analytics";
import type { SavedSearch, AdvancedSearchFilters } from "@/types/search";

type Filters = Omit<AdvancedSearchFilters, "page">;

interface SavedSearchesMenuProps {
  walletAddress: string;
  currentFilters: Filters;
  hasActiveFilters: boolean;
  onApply: (filters: Filters) => void;
}

export function SavedSearchesMenu({
  walletAddress,
  currentFilters,
  hasActiveFilters,
  onApply,
}: SavedSearchesMenuProps) {
  const [open, setOpen] = useState(false);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    () => setSearches(savedSearchService.getSavedSearches(walletAddress)),
    [walletAddress],
  );

  useEffect(refresh, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = savedSearchService.saveSearch(walletAddress, name, currentFilters);
    setMessage(res.success ? "Search saved" : res.error ?? "Could not save");
    if (res.success) setName("");
    refresh();
  };

  const handleRename = (id: string) => {
    if (editName.trim()) savedSearchService.updateSearch(walletAddress, id, { name: editName.trim() });
    setEditingId(null);
    refresh();
  };

  const handleExport = () => {
    const blob = new Blob([savedSearchService.exportSearches(walletAddress)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dongle-saved-searches.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const res = savedSearchService.importSearches(walletAddress, await file.text());
    setMessage(res.error ?? `Imported ${res.imported} search${res.imported === 1 ? "" : "es"}`);
    refresh();
  };

  const atLimit = searches.length >= MAX_SAVED_SEARCHES;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-medium hover:border-zinc-300 dark:hover:border-zinc-700"
      >
        <Bookmark className="w-4 h-4" />
        Saved searches
        {searches.length > 0 && (
          <span className="text-xs text-zinc-500">({searches.length})</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-3 space-y-3">
          {hasActiveFilters && (
            <form onSubmit={handleSave} className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Name, e.g. "DeFi projects with audits"'
                maxLength={60}
                disabled={atLimit}
                aria-label="Saved search name"
                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={atLimit || !name.trim()}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white disabled:opacity-50"
              >
                Save this search
              </button>
            </form>
          )}
          {atLimit && (
            <p className="text-xs text-amber-600">
              Maximum {MAX_SAVED_SEARCHES} saved searches reached. Delete one to save more.
            </p>
          )}
          {message && <p className="text-xs text-zinc-500" role="status">{message}</p>}

          {searches.length === 0 ? (
            <p className="text-sm text-zinc-500 py-2">
              No saved searches yet{hasActiveFilters ? "" : " — apply filters to save one"}.
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {searches.map((s) => (
                <li key={s.id} className="flex items-center gap-2 py-2">
                  {editingId === s.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleRename(s.id)}
                        aria-label="Rename saved search"
                        className="flex-1 min-w-0 px-2 py-1 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-transparent"
                      />
                      <button type="button" aria-label="Confirm rename" onClick={() => handleRename(s.id)}>
                        <Check className="w-4 h-4 text-green-600" />
                      </button>
                      <button type="button" aria-label="Cancel rename" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4 text-zinc-400" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left text-sm truncate hover:text-blue-600"
                        onClick={() => {
                          onApply(s.filters);
                          track("saved_search_apply", { searchId: s.id });
                          setOpen(false);
                        }}
                      >
                        {s.name}
                      </button>
                      <button
                        type="button"
                        aria-label={`Rename ${s.name}`}
                        onClick={() => {
                          setEditingId(s.id);
                          setEditName(s.name);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${s.name}`}
                        onClick={() => {
                          savedSearchService.deleteSearch(walletAddress, s.id);
                          refresh();
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-600" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleExport}
              disabled={searches.length === 0}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700"
            >
              <Upload className="w-3.5 h-3.5" /> Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SavedSearchesMenu;
