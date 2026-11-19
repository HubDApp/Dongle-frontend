"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredItem, setStoredItem } from "@/lib/indexed-storage";

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

async function readDrafts(): Promise<ReviewDrafts> {
  if (typeof window === "undefined") return {};

  try {
    const parsed: unknown = (await getStoredItem<unknown>(REVIEW_DRAFT_STORAGE_KEY)) ?? {};
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

async function writeDrafts(drafts: ReviewDrafts) {
  if (typeof window === "undefined") return;
  await setStoredItem(REVIEW_DRAFT_STORAGE_KEY, drafts);
}

export function useReviewDraft(
  projectId: string,
  walletAddress: string,
  enabled = true,
) {
  const draftKey = `${projectId}:${walletAddress}`;
  const [draft, setDraft] = useState<StoredReviewDraft | null>(null);

  const refreshDraft = useCallback(() => {
    if (!enabled) {
      setDraft(null);
      return;
    }
    void readDrafts().then((drafts) => setDraft(drafts[draftKey] ?? null));
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
      const entry = { data, savedAt: Date.now() };
      setDraft(entry);
      void readDrafts().then((drafts) => writeDrafts({ ...drafts, [draftKey]: entry }));
    },
    [draftKey, enabled, walletAddress],
  );

  const clearDraft = useCallback(() => {
    if (!enabled) return;
    setDraft(null);
    void readDrafts().then((drafts) => {
      delete drafts[draftKey];
      return writeDrafts(drafts);
    });
  }, [draftKey, enabled]);

  const dismissRecovery = useCallback(() => setDraft(null), []);

  return { draft, saveDraft, clearDraft, dismissRecovery };
}
