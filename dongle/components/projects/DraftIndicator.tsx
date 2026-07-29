/**
 * Draft Indicator Component
 * Shows draft status, last saved time, and allows discarding drafts
 */

import React from "react";
import { Save, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

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

  const formatLastSaved = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
      <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
        <Save className="w-4 h-4" />
        <span className="font-medium">Draft saved</span>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatLastSaved(lastSaved)}</span>
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
