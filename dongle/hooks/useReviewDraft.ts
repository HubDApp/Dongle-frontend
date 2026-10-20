"use client";

import { useCallback, useEffect, useState } from "react";

export const REVIEW_DRAFT_STORAGE_KEY = "dongle_review_drafts";
const REVIEW_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReviewDraftData {
  rating: number;
  comment: string;
}

interface StoredReviewDraft {
  data: ReviewDraftData;
  savedAt: number;
}

type ReviewDrafts = Record<string, StoredReviewDraft>;

function readDrafts(): ReviewDrafts {
  if (typeof window === "undefined") return {};

  try {
    const value = localStorage.getItem(REVIEW_DRAFT_STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed as ReviewDrafts).filter(([, draft]) =>
        draft &&
        typeof draft.savedAt === "number" &&
        now - draft.savedAt < REVIEW_DRAFT_TTL_MS &&
        typeof draft.data?.comment === "string" &&
        Number.isInteger(draft.data?.rating),
      ),
    );
  } catch {
    return {};
  }
}

function writeDrafts(drafts: ReviewDrafts) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REVIEW_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

export function useReviewDraft(
  projectId: string,
  walletAddress: string,
  enabled = true,
) {
  const draftKey = `${projectId}:${walletAddress}`;
  const [draft, setDraft] = useState<StoredReviewDraft | null>(null);

  const refreshDraft = useCallback(() => {
    setDraft(enabled ? readDrafts()[draftKey] ?? null : null);
  }, [draftKey, enabled]);

  useEffect(() => {
    refreshDraft();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === REVIEW_DRAFT_STORAGE_KEY) refreshDraft();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshDraft]);

  const saveDraft = useCallback(
    (data: ReviewDraftData) => {
      if (!enabled || !walletAddress) return;
      const drafts = readDrafts();
      const next = { ...drafts, [draftKey]: { data, savedAt: Date.now() } };
      writeDrafts(next);
      setDraft(next[draftKey]);
    },
    [draftKey, enabled, walletAddress],
  );

  const clearDraft = useCallback(() => {
    if (!enabled) return;
    const drafts = readDrafts();
    delete drafts[draftKey];
    writeDrafts(drafts);
    setDraft(null);
  }, [draftKey, enabled]);

  const dismissRecovery = useCallback(() => setDraft(null), []);

  return { draft, saveDraft, clearDraft, dismissRecovery };
}
