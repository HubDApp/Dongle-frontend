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
  isSaved?: boolean;
  saveError?: string | null;
  onDiscard: () => void;
}

export function DraftIndicator({
  hasDraft,
  lastSaved,
  isSaving = false,
  isSaved = false,
  saveError = null,
  onDiscard,
}: DraftIndicatorProps) {
  if (!hasDraft && !isSaving) return null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-500/5 border border-zinc-200 dark:border-zinc-800 text-sm animate-fade-in">
      <div className="flex items-center gap-3">
        {isSaving ? (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-medium">Saving...</span>
          </div>
        ) : isSaved ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">Saved</span>
          </div>
        ) : saveError ? (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium text-xs">{saveError}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <Save className="w-4 h-4" />
            <span className="font-medium">Draft saved</span>
            {lastSaved && (
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDate(lastSaved, "relative")}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {hasDraft && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8"
          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
        >
          Discard
        </Button>
      )}
    </div>
  );
}
