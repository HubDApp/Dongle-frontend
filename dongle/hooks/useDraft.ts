/**
 * Hook for managing project drafts
 */

import { useState, useEffect, useCallback } from "react";
import { draftService, type ProjectDraft } from "@/services/draft/draft.service";

type DraftData = ProjectDraft["data"];

interface UseDraftOptions {
  mode: "create" | "edit";
  projectId?: string;
  autoSave?: boolean;
}

interface UseDraftReturn {
  draftId: string;
  hasDraft: boolean;
  loadedDraft: DraftData | null;
  lastSaved: string | null;
  saveDraft: (data: DraftData) => void;
  deleteDraft: () => void;
  clearDraft: () => void;
}

export function useDraft(options: UseDraftOptions): UseDraftReturn {
  const { mode, projectId, autoSave = true } = options;
  
  // Generate a consistent draft ID based on mode and projectId
  const draftId = mode === "create" ? "new-project-draft" : `edit-project-${projectId}`;
  
  const [hasDraft, setHasDraft] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<DraftData | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Load existing draft on mount
  useEffect(() => {
    const existing = draftService.getDraftForProject(mode, projectId);
    if (existing) {
      setHasDraft(true);
      setLoadedDraft(existing.data);
      setLastSaved(existing.lastSaved);
    }
  }, [mode, projectId]);

  // Save draft function
  const saveDraft = useCallback(
    (data: DraftData) => {
      // Only save if there's actual content
      if (!draftService.hasContent(data)) {
        return;
      }

      const draft: Omit<ProjectDraft, "lastSaved"> = {
        id: draftId,
        data,
        mode,
        projectId,
      };

      if (autoSave) {
        draftService.autoSaveDraft(draft);
      } else {
        draftService.saveDraft(draft);
      }

      setHasDraft(true);
      setLastSaved(new Date().toISOString());
    },
    [draftId, mode, projectId, autoSave]
  );

  // Delete draft function
  const deleteDraft = useCallback(() => {
    draftService.deleteDraft(draftId);
    setHasDraft(false);
    setLoadedDraft(null);
    setLastSaved(null);
  }, [draftId]);

  // Alias for consistency
  const clearDraft = deleteDraft;

  return {
    draftId,
    hasDraft,
    loadedDraft,
    lastSaved,
    saveDraft,
    deleteDraft,
    clearDraft,
  };
}
