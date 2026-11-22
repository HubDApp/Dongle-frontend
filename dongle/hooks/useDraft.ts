/**
 * useDraft hook
 *
 * Manages project draft state with:
 *   • 2-second debounce on auto-save
 *   • Server-side persistence when a wallet address is provided
 *   • localStorage fallback when no wallet is connected
 *   • Cross-tab sync via BroadcastChannel
 *   • isSaving / saveError state for UI feedback
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  draftService,
  AUTO_SAVE_DEBOUNCE_MS,
  type ProjectDraft,
} from "@/services/draft/draft.service";

// ---------------------------------------------------------------------------
// BroadcastChannel message type
// ---------------------------------------------------------------------------

type DraftSyncMessage =
  | { type: "DRAFT_SAVED"; draftId: string; draft: ProjectDraft }
  | { type: "DRAFT_DELETED"; draftId: string };

const CHANNEL_NAME = "dongle_draft_sync";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DraftData = ProjectDraft["data"];

export interface UseDraftOptions {
  mode: "create" | "edit";
  projectId?: string;
  autoSave?: boolean;
  /** Stellar public key – when provided drafts are persisted to the server. */
  walletAddress?: string | null;
}

export interface UseDraftReturn {
  draftId: string;
  hasDraft: boolean;
  loadedDraft: DraftData | null;
  lastSaved: string | null;
  isSaving: boolean;
  isSaved: boolean;
  saveError: string | null;
  saveDraft: (data: DraftData) => void;
  forceSave: () => void;
  deleteDraft: () => void;
  clearDraft: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDraft(options: UseDraftOptions): UseDraftReturn {
  const { mode, projectId, autoSave = true, walletAddress } = options;

  // Stable draft ID derived from mode + optional projectId
  const draftId =
    mode === "create" ? "new-project-draft" : `edit-project-${projectId}`;

  const [hasDraft, setHasDraft] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<DraftData | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Ref to hold the current draft data for force saving
  const currentDataRef = useRef<DraftData | null>(null);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Ref to hold the debounce timer without causing re-renders
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BroadcastChannel reference (null in environments that don't support it)
  const channelRef = useRef<BroadcastChannel | null>(null);

  // ── Initialize BroadcastChannel ──────────────────────────────────────────
  useEffect(() => {
    const existing = draftService.getDraftForProject(mode, projectId, walletAddress);
    if (!existing) return;
    // Schedule state updates as a microtask to avoid synchronous setState-in-effect.
    const id = setTimeout(() => {
      setHasDraft(true);
      setLoadedDraft(existing.data);
      setLastSaved(existing.lastSaved);
      currentDataRef.current = existing.data;
    }, 0);
    return () => clearTimeout(id);
  }, [mode, projectId, walletAddress]);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<DraftSyncMessage>) => {
      const msg = event.data;
      if (!msg || msg.draftId !== draftId) return;

      if (msg.type === "DRAFT_SAVED") {
        setHasDraft(true);
        setLoadedDraft(msg.draft.data);
        setLastSaved(msg.draft.lastSaved);
      } else if (msg.type === "DRAFT_DELETED") {
        setHasDraft(false);
        setLoadedDraft(null);
        setLastSaved(null);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [draftId]);

  // ── Load draft on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadDraft = async () => {
      // Prefer remote draft when wallet is present
      if (walletAddress) {
        const remote = await draftService.getDraftRemote(walletAddress, draftId);
        if (cancelled) return;
        if (remote) {
          setHasDraft(true);
          setLoadedDraft(remote.data);
          setLastSaved(remote.lastSaved);
          return;
        }
      }

      // Fall back to localStorage (encrypted with Stellar public key hash)
      const local = draftService.getDraftForProject(mode, projectId, walletAddress);
      if (cancelled) return;
      if (local) {
        setHasDraft(true);
        setLoadedDraft(local.data);
        setLastSaved(local.lastSaved);
      }
    };

    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, draftId, mode, projectId]);

  // ── Internal save logic ──────────────────────────────────────────────────
  const performSave = useCallback(
    async (data: DraftData) => {
      // Skip if there is no meaningful content
      if (!draftService.hasContent(data)) return;

      const draft: Omit<ProjectDraft, "lastSaved"> = {
        id: draftId,
        data,
        mode,
        projectId,
      };

      setIsSaving(true);
      setSaveError(null);
      setIsSaved(false);

      try {
        let savedDraft: ProjectDraft | null = null;

        if (walletAddress) {
          // Remote first
          savedDraft = await draftService.saveDraftRemote(walletAddress, draft);
          if (!isMountedRef.current) return;
          if (!savedDraft) {
            // Remote failed – fall back to localStorage and surface error
            draftService.saveDraft(draft, walletAddress);
            setSaveError("Could not sync to server; saved locally.");
            savedDraft = draftService.getDraft(draftId, walletAddress);
          }
        } else {
          // localStorage only (encrypted)
          draftService.saveDraft(draft, walletAddress);
          if (!isMountedRef.current) return;
          savedDraft = draftService.getDraft(draftId, walletAddress);
        }

        const ts = savedDraft?.lastSaved ?? new Date().toISOString();
        setHasDraft(true);
        setLastSaved(ts);
        setIsSaved(true);

        // Notify other tabs
        if (savedDraft && channelRef.current) {
          const msg: DraftSyncMessage = {
            type: "DRAFT_SAVED",
            draftId,
            draft: savedDraft,
          };
          channelRef.current.postMessage(msg);
        }
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save draft"
        );
      } finally {
        setIsSaving(false);
      }
    },
    [draftId, mode, projectId, walletAddress]
  );

  // ── saveDraft ─────────────────────────────────────────────────────────────
  const saveDraft = useCallback(
    (data: DraftData) => {
      currentDataRef.current = data;

      if (!autoSave) {
        void performSave(data);
        return;
      }

      // Debounced save (2 seconds)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Requirement: Show "Saving..." while debouncing
      setIsSaving(true);
      setIsSaved(false);

      debounceRef.current = setTimeout(async () => {
        debounceRef.current = null;
        await performSave(data);
      }, AUTO_SAVE_DEBOUNCE_MS);
    },
    [autoSave, performSave]
  );

  // ── forceSave ─────────────────────────────────────────────────────────────
  const forceSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (currentDataRef.current) {
      void performSave(currentDataRef.current);
    }
  }, [performSave]);

  // ── deleteDraft ───────────────────────────────────────────────────────────
  const deleteDraft = useCallback(async () => {
    // Cancel any pending auto-save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    draftService.deleteDraft(draftId, walletAddress);

    if (walletAddress) {
      await draftService.deleteDraftRemote(walletAddress, draftId);
    }

    setHasDraft(false);
    setLoadedDraft(null);
    setLastSaved(null);
    setSaveError(null);
    setIsSaving(false);
    setIsSaved(false);

    // Notify other tabs
    if (channelRef.current) {
      const msg: DraftSyncMessage = { type: "DRAFT_DELETED", draftId };
      channelRef.current.postMessage(msg);
    }
  }, [draftId, walletAddress]);

  // clearDraft is an alias for deleteDraft
  const clearDraft = deleteDraft;

  // ── Effects ───────────────────────────────────────────────────────────────

  // Clear "Saved" status after 3 seconds
  useEffect(() => {
    if (isSaved) {
      const id = setTimeout(() => setIsSaved(false), 3000);
      return () => clearTimeout(id);
    }
  }, [isSaved]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    draftId,
    hasDraft,
    loadedDraft,
    lastSaved,
    isSaving,
    isSaved,
    saveError,
    saveDraft,
    forceSave,
    deleteDraft,
    clearDraft,
  };
}
