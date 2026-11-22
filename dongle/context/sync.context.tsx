"use client";

/**
 * Sync context
 *
 * Mounts the app-wide cross-device sync session for the connected wallet:
 *   • `backup` — the encrypted cloud-backup state (`useCloudBackup`), and
 *   • `device` — the real-time device sync (`useDeviceSync`): registry, SSE
 *     stream and offline queue, wired to reconcile incoming revisions.
 *
 * Kept as a single provider so there is exactly one SSE stream and one
 * auto-sync timer per tab, and every consumer (settings page, status
 * indicator, device list) shares the same state.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useWallet } from "@/context/wallet.context";
import { useCloudBackup } from "@/hooks/useCloudBackup";
import { useDeviceSync } from "@/hooks/useDeviceSync";

export interface SyncContextValue {
  /** Cloud-backup state + actions (opt-in, backup/restore, conflicts). */
  backup: ReturnType<typeof useCloudBackup>;
  /** Real-time device sync state + actions (devices, status, queue). */
  device: ReturnType<typeof useDeviceSync>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const backup = useCloudBackup(publicKey);

  const device = useDeviceSync(publicKey, {
    enabled: backup.isEnabled,
    onRemoteRevision: backup.applyRemoteRevision,
    onFlush: backup.syncNow,
  });

  const value = useMemo<SyncContextValue>(() => ({ backup, device }), [backup, device]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

/** Access the shared sync session. Must be used within `SyncProvider`. */
export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return context;
}
