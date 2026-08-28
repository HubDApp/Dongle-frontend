"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getLastSyncError,
  getPendingMutationCount,
  getSyncUiStatus,
  isOnline,
  subscribeConnectivity,
  subscribeSyncStatus,
  syncQueuedMutations,
  type SyncUiStatus,
} from "@/lib/data-layer";

function subscribeOnline(listener: () => void): () => void {
  return subscribeConnectivity(() => listener());
}

export function useDataSyncStatus() {
  const online = useSyncExternalStore(subscribeOnline, isOnline, () => true);
  const syncStatus = useSyncExternalStore(
    subscribeSyncStatus,
    getSyncUiStatus,
    () => "idle" as SyncUiStatus,
  );
  const pendingCount = useSyncExternalStore(
    subscribeSyncStatus,
    getPendingMutationCount,
    () => 0,
  );
  const lastError = useSyncExternalStore(
    subscribeSyncStatus,
    getLastSyncError,
    () => null,
  );

  const retrySync = useMemo(() => () => {
    void syncQueuedMutations();
  }, []);

  return {
    isOnline: online,
    syncStatus,
    pendingCount,
    lastError,
    retrySync,
  };
}
