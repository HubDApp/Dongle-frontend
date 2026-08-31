/**
 * DraftIndicator component
 *
 * Shows the current draft-save status:
 *   • "Saving…"  – animated spinner while auto-save is in progress
 *   • "Saved"    – green check with relative timestamp after a successful save
 *   • Error hint – amber warning when save failed (fell back to localStorage)
 *
 * Also provides the "Discard Draft" action.
 */

"use client";

import React, { useEffect, useState } from "react";
import { Save, CheckCircle2, Clock, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/date";

interface DraftIndicatorProps {
  hasDraft: boolean;
  lastSaved: string | null;
  isSaving?: boolean;
  saveError?: string | null;
  onDiscard: () => void;
}

function formatLastSaved(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffSecs < 10) return "just now";
  if (diffMins < 1) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function DraftIndicator({
  hasDraft,
  lastSaved,
  isSaving = false,
  saveError = null,
  onDiscard,
}: DraftIndicatorProps) {
  if (!hasDraft || !lastSaved) return null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
      <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
        <Save className="w-4 h-4" />
        <span className="font-medium">Draft saved</span>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDate(lastSaved, "relative")}</span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDiscard}
        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
      >
        Discard Draft
      </Button>
    </div>
  );

  // Draft exists but no timestamp yet (edge case)
  if (hasDraft) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Save className="w-4 h-4" />
          <span className="font-medium">Draft saved</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
        >
          Discard Draft
        </Button>
      </div>
    );
  }

  return null;
}
