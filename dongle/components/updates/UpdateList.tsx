"use client";

import React, { useState, useMemo } from "react";
import { ProjectUpdate, UpdateType, UPDATE_TYPES } from "@/types/update";
import { formatDateUTC, formatRelative } from "@/lib/date";
import { Badge } from "@/components/ui/Badge";
import { Megaphone, Shield, Target, Bell, Edit2, Trash2, ArrowUpDown } from "lucide-react";

interface UpdateListProps {
  updates: ProjectUpdate[];
  canManage?: boolean;
  onEdit?: (update: ProjectUpdate) => void;
  onDelete?: (id: string) => void;
}

const UPDATE_ICONS: Record<UpdateType, React.ElementType> = {
  [UPDATE_TYPES.RELEASE]: Bell,
  [UPDATE_TYPES.AUDIT]: Shield,
  [UPDATE_TYPES.MILESTONE]: Target,
  [UPDATE_TYPES.ANNOUNCEMENT]: Megaphone,
};

const UPDATE_COLORS: Record<UpdateType, string> = {
  [UPDATE_TYPES.RELEASE]: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  [UPDATE_TYPES.AUDIT]: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  [UPDATE_TYPES.MILESTONE]: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  [UPDATE_TYPES.ANNOUNCEMENT]: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
};

type SortOption = "newest" | "oldest" | "type";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  type: "By type",
};

export default function UpdateList({
  updates,
  canManage = false,
  onEdit,
  onDelete,
}: UpdateListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [typeFilter, setTypeFilter] = useState<UpdateType | "All">("All");

  const updateTypes = useMemo((): UpdateType[] => {
    const seen = new Set<UpdateType>();
    updates.forEach((u) => seen.add(u.type));
    return Array.from(seen).sort();
  }, [updates]);

  const sorted = useMemo(() => {
    let list = typeFilter === "All"
      ? [...updates]
      : updates.filter((u) => u.type === typeFilter);

    if (sortBy === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    } else if (sortBy === "oldest") {
      list.sort(
        (a, b) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
      );
    } else if (sortBy === "type") {
      list.sort((a, b) => {
        const typeCmp = a.type.localeCompare(b.type);
        if (typeCmp !== 0) return typeCmp;
        // Secondary: newest within same type
        return (
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      });
    }

    return list;
  }, [updates, sortBy, typeFilter]);

  if (updates.length === 0) {
    return (
      <div className="text-center py-12">
        <Megaphone className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 dark:text-zinc-400">
          No updates yet. Check back later for news and announcements.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort + Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort selector */}
        <div className="flex items-center gap-2 text-sm">
          <ArrowUpDown className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="Sort updates"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
              <option key={opt} value={opt}>
                {SORT_LABELS[opt]}
              </option>
            ))}
          </select>
        </div>

        {/* Type filter pills */}
        {updateTypes.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter("All")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === "All"
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              All
            </button>
            {updateTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        {typeFilter !== "All" && (
          <span className="text-xs text-zinc-400 ml-auto">
            {sorted.length} of {updates.length}
          </span>
        )}
      </div>

      {/* Empty filtered state */}
      {sorted.length === 0 && (
        <div className="text-center py-8">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            No {typeFilter} updates yet.
          </p>
        </div>
      )}

      {/* Update cards */}
      {sorted.map((update) => {
        const Icon = UPDATE_ICONS[update.type];
        const colorClass = UPDATE_COLORS[update.type];

        return (
          <div
            key={update.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${colorClass}`}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-lg">{update.title}</h4>
                    {update.version && (
                      <Badge variant="secondary" className="text-xs">
                        {update.version}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <Badge variant="secondary" className="text-xs">
                      {update.type}
                    </Badge>
                    {/* Primary: human-readable UTC date; secondary: relative */}
                    <time
                      dateTime={update.publishedAt}
                      title={formatRelative(update.publishedAt)}
                    >
                      {formatDateUTC(update.publishedAt, "long")}
                    </time>
                  </div>
                </div>
              </div>

              {canManage && onEdit && onDelete && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(update)}
                    className="p-2 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Edit update"
                    aria-label="Edit update"
                  >
                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(update.id)}
                    className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete update"
                    aria-label="Delete update"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {update.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
