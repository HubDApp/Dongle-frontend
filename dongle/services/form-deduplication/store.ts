/**
 * Persistent Storage for Deduplication Merge History and Decisions
 */

import { generateId } from "@/lib/id-generator";
import { nowUTC } from "@/lib/date";
import type { MergeHistoryRecord } from "./types";

const MERGE_HISTORY_STORAGE_KEY = "dongle_submission_merge_history";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Load all merge history records
 */
export function loadMergeHistory(): MergeHistoryRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(MERGE_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save merge history records
 */
export function saveMergeHistory(history: MergeHistoryRecord[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MERGE_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("[DeduplicationStore] Failed to save merge history:", error);
  }
}

/**
 * Record a new merge operation
 */
export function recordMerge(
  record: Omit<MergeHistoryRecord, "id" | "timestamp" | "status">,
): MergeHistoryRecord {
  const history = loadMergeHistory();
  const newRecord: MergeHistoryRecord = {
    ...record,
    id: `merge_${generateId()}`,
    timestamp: nowUTC(),
    status: "active",
  };

  history.unshift(newRecord);
  saveMergeHistory(history);
  return newRecord;
}

/**
 * Get a merge record by ID
 */
export function getMergeRecord(mergeId: string): MergeHistoryRecord | null {
  const history = loadMergeHistory();
  return history.find((h) => h.id === mergeId) ?? null;
}

/**
 * Mark a merge record as restored
 */
export function markMergeRestored(
  mergeId: string,
  restoredBy: string,
  reason?: string,
): MergeHistoryRecord | null {
  const history = loadMergeHistory();
  const index = history.findIndex((h) => h.id === mergeId);
  if (index === -1) return null;

  history[index] = {
    ...history[index],
    status: "restored",
    restoredAt: nowUTC(),
    restoredBy,
    restoreReason: reason,
  };

  saveMergeHistory(history);
  return history[index];
}

/**
 * Clear merge history (testing/admin only)
 */
export function clearMergeHistory(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(MERGE_HISTORY_STORAGE_KEY);
}
