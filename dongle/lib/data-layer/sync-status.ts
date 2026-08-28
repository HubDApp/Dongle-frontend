/**
 * UI-facing synchronization status store.
 */

import type { SyncUiStatus } from "./types";

type Listener = () => void;

let status: SyncUiStatus = "idle";
let pendingCount = 0;
let lastError: string | null = null;
const listeners = new Set<Listener>();
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function emit(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* isolate */
    }
  }
}

export function getSyncUiStatus(): SyncUiStatus {
  return status;
}

export function getPendingMutationCount(): number {
  return pendingCount;
}

export function getLastSyncError(): string | null {
  return lastError;
}

export function setSyncUiStatus(next: SyncUiStatus, error?: string | null): void {
  const changed = status !== next || lastError !== (error ?? lastError);
  status = next;
  if (error !== undefined) lastError = error;
  if (next === "synced") lastError = null;
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (next === "synced") {
    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (status === "synced") {
        status = "idle";
        emit();
      }
    }, 3000);
  }
  if (changed) emit();
}

export function setPendingMutationCount(count: number): void {
  if (pendingCount === count) return;
  pendingCount = count;
  emit();
}

export function subscribeSyncStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetSyncStatusForTests(): void {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  status = "idle";
  pendingCount = 0;
  lastError = null;
  listeners.clear();
}
