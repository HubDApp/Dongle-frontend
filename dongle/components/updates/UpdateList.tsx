"use client";

import React from "react";
import { ProjectUpdate } from "@/types/update";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Megaphone, Shield, Target, Bell, Edit2, Trash2 } from "lucide-react";

interface UpdateListProps {
  updates: ProjectUpdate[];
  canManage?: boolean;
  onEdit?: (update: ProjectUpdate) => void;
  onDelete?: (id: string) => void;
}

const UPDATE_ICONS = {
  Release: Bell,
  "Security Audit": Shield,
  Milestone: Target,
  Announcement: Megaphone,
};

const UPDATE_COLORS = {
  Release: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  "Security Audit": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  Milestone: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  Announcement: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
};

export default function UpdateList({
  updates,
  canManage = false,
  onEdit,
  onDelete,
}: UpdateListProps) {
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
      {updates.map((update) => {
        const Icon = UPDATE_ICONS[update.type];
        const colorClass = UPDATE_COLORS[update.type];

        return (
          <div
            key={update.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
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
                    <span>{formatDate(update.publishedAt, "long")}</span>
                  </div>
                </div>
              </div>

              {canManage && onEdit && onDelete && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(update)}
                    className="p-2 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Edit update"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(update.id)}
                    className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete update"
                  >
                    <Trash2 className="w-4 h-4" />
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
