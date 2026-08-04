/**
 * Draft Indicator Component
 * Shows draft status, last saved time, and allows discarding drafts
 */

import React from "react";
import { Save, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/date";

interface DraftIndicatorProps {
  hasDraft: boolean;
  lastSaved: string | null;
  onDiscard: () => void;
}

export function DraftIndicator({
  hasDraft,
  lastSaved,
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
}
