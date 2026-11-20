"use client";

/**
 * useCloudBackup
 *
 * React glue for the optional, client-side encrypted cloud backup:
 *   • opt-in toggle persisted per device
 *   • automatic sync every 5 minutes while enabled
 *   • manual "Back up now" / "Restore from cloud"
 *   • divergence detection surfaced as a conflict for the UI to resolve
 *
 * The actual encryption + transport lives in
 * `services/backup/cloud-backup.service.ts`; the server only ever sees the
 * opaque ciphertext.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BACKUP_PREFS_KEY,
  BACKUP_SECTIONS,
  applyBackupData,
  captureBackupPayload,
  describeSection,
  downloadBackup,
  hasBackupContent,
  mergeBackupData,
  payloadFingerprint,
  readPrefs,
  sectionFingerprint,
  uploadBackup,
  writePrefs,
  type BackupPayload,
  type BackupSectionKey,
  type CloudBackupPrefs,
} from "@/services/backup/cloud-backup.service";
import {
  queueLocalChange,
  readSyncState,
  remoteWinsLastWrite,
  writeSyncState,
  type SyncStreamEvent,
} from "@/services/sync/device-sync.service";

/** Record a pending sync when a push fails while the device is offline. */
function noteOfflineQueue(wallet: string): void {
  if (typeof navigator !== "undefined" && !navigator.onLine) queueLocalChange(wallet);
}

/** Requirement: automatic sync cadence. */
export const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export type CloudBackupStatus =
  | "idle"
  | "syncing"
  | "backing-up"
  | "restoring"
  | "success"
  | "error";

export interface BackupConflictSection {
  key: BackupSectionKey;
  label: string;
  /** True when this section genuinely differs between the two snapshots. */
  differs: boolean;
  localSummary: string;
  remoteSummary: string;
}

export interface BackupConflict {
  local: BackupPayload;
  remote: BackupPayload;
  sections: BackupConflictSection[];
}

const INITIAL_PREFS: CloudBackupPrefs = {
  enabled: false,
  lastBackupAt: null,
  lastSyncedAt: null,
  lastSyncedFingerprint: null,
};

export function useCloudBackup(wallet: string | null | undefined) {
  const [prefs, setPrefs] = useState<CloudBackupPrefs>(INITIAL_PREFS);
  const [status, setStatus] = useState<CloudBackupStatus>("idle");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState<BackupConflict | null>(null);
  const busyRef = useRef(false);

  // ── Load + cross-tab sync of the opt-in bookkeeping ───────────────────────
  useEffect(() => {
    setPrefs(readPrefs());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BACKUP_PREFS_KEY) setPrefs(readPrefs());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const applyPrefs = useCallback((patch: Partial<CloudBackupPrefs>) => {
    const next = { ...readPrefs(), ...patch };
    writePrefs(next);
    setPrefs(next);
    return next;
  }, []);

  const buildConflict = useCallback(
    (local: BackupPayload, remote: BackupPayload): BackupConflict => {
      const address = wallet ?? "";
      return {
        local,
        remote,
        sections: BACKUP_SECTIONS.map(({ key, label }) => ({
          key,
          label,
          differs:
            sectionFingerprint(local.data, key) !== sectionFingerprint(remote.data, key),
          localSummary: describeSection(local.data, key, address),
          remoteSummary: describeSection(remote.data, key, address),
        })),
      };
    },
    [wallet],
  );

  // ── Opt-in ────────────────────────────────────────────────────────────────
  const setEnabled = useCallback(
    (enabled: boolean): boolean => {
      applyPrefs({ enabled });
      setStatus("idle");
      setMessage(
        enabled
          ? "Cloud backup is on. Syncs automatically every 5 minutes."
          : "Cloud backup is off. Your data stays on this device.",
      );
      return enabled;
    },
    [applyPrefs],
  );

  // ── Manual backup ─────────────────────────────────────────────────────────
  const backupNow = useCallback(async (): Promise<boolean> => {
    if (!wallet) {
      setStatus("error");
      setMessage("Connect your wallet to back up.");
      return false;
    }
    if (busyRef.current) return false;
    busyRef.current = true;
    setStatus("backing-up");
    setMessage("");
    try {
      const payload = await captureBackupPayload(wallet);
      const result = await uploadBackup(wallet, payload);
      if (!result.ok) {
        noteOfflineQueue(wallet);
        setStatus("error");
        setMessage(result.error ?? "Backup failed.");
        return false;
      }
      const now = new Date().toISOString();
      applyPrefs({
        lastBackupAt: now,
        lastSyncedAt: now,
        lastSyncedFingerprint: payloadFingerprint(payload),
      });
      setStatus("success");
      setMessage("Encrypted backup uploaded to the cloud.");
      return true;
    } catch {
      setStatus("error");
      setMessage("Backup failed unexpectedly.");
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [wallet, applyPrefs]);

  // ── Manual restore (with divergence detection) ────────────────────────────
  const restoreNow = useCallback(async (): Promise<boolean> => {
    if (!wallet) {
      setStatus("error");
      setMessage("Connect your wallet to restore.");
      return false;
    }
    if (busyRef.current) return false;
    busyRef.current = true;
    setStatus("restoring");
    setMessage("");
    try {
      const remoteResult = await downloadBackup(wallet);
      if (!remoteResult.ok || !remoteResult.payload) {
        setStatus("error");
        setMessage(remoteResult.error ?? "Could not download the backup.");
        return false;
      }

      const remote = remoteResult.payload;
      const local = await captureBackupPayload(wallet);
      const localFp = payloadFingerprint(local);
      const remoteFp = payloadFingerprint(remote);
      const syncedFp = readPrefs().lastSyncedFingerprint;

      if (localFp === remoteFp) {
        applyPrefs({ lastSyncedAt: new Date().toISOString(), lastSyncedFingerprint: remoteFp });
        setStatus("success");
        setMessage("This device is already up to date.");
        return true;
      }

      // Local edits that were never synced + differing cloud data = conflict.
      if (hasBackupContent(local.data) && localFp !== syncedFp) {
        setConflict(buildConflict(local, remote));
        setStatus("idle");
        setMessage("Your local data and the cloud backup differ. Choose what to keep.");
        return false;
      }

      await applyBackupData(wallet, remote.data);
      applyPrefs({ lastSyncedAt: new Date().toISOString(), lastSyncedFingerprint: remoteFp });
      setStatus("success");
      setMessage("Restored from the cloud backup.");
      return true;
    } catch {
      setStatus("error");
      setMessage("Restore failed unexpectedly.");
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [wallet, applyPrefs, buildConflict]);

  // ── Conflict resolution ───────────────────────────────────────────────────
  const resolveConflict = useCallback(
    async (choices: Record<BackupSectionKey, "local" | "remote">): Promise<boolean> => {
      if (!wallet || !conflict) return false;
      if (busyRef.current) return false;
      busyRef.current = true;
      setStatus("syncing");
      setMessage("");
      try {
        const merged = mergeBackupData(conflict.local.data, conflict.remote.data, choices);
        await applyBackupData(wallet, merged);

        const payload: BackupPayload = {
          ...conflict.local,
          capturedAt: new Date().toISOString(),
          data: merged,
        };
        const result = await uploadBackup(wallet, payload);
        if (!result.ok) {
          noteOfflineQueue(wallet);
          setStatus("error");
          setMessage(result.error ?? "Could not sync the resolved data.");
          return false;
        }

        applyPrefs({
          lastBackupAt: payload.capturedAt,
          lastSyncedAt: payload.capturedAt,
          lastSyncedFingerprint: payloadFingerprint(payload),
        });
        setConflict(null);
        setStatus("success");
        setMessage("Conflict resolved — devices are back in sync.");
        return true;
      } catch {
        setStatus("error");
        setMessage("Conflict resolution failed unexpectedly.");
        return false;
      } finally {
        busyRef.current = false;
      }
    },
    [wallet, conflict, applyPrefs],
  );

  const cancelConflict = useCallback(() => {
    setConflict(null);
    setStatus("idle");
    setMessage("Conflict resolution cancelled. Nothing was changed.");
  }, []);

  // ── Real-time reconcile (last-write-wins with timestamps) ─────────────────
  /**
   * Pull and reconcile a revision signalled by another device over the sync
   * stream. Unlike the manual restore flow (which surfaces a per-section
   * conflict), the real-time path resolves divergences automatically using
   * last-write-wins: the newer of the local change / remote revision wins,
   * with ties going to the server revision.
   */
  const applyRemoteRevision = useCallback(
    async (event: Pick<SyncStreamEvent, "revision" | "updatedAt" | "capturedAt" | "deviceId">) => {
      if (!wallet) return false;
      if (busyRef.current) return false;
      busyRef.current = true;
      setStatus("syncing");
      setMessage("");
      try {
        const remoteResult = await downloadBackup(wallet);
        const now = new Date().toISOString();

        if (!remoteResult.ok || !remoteResult.payload) {
          // Nothing to pull — just advance the revision marker.
          writeSyncState(wallet, { lastRevision: event.revision, lastSyncedAt: now });
          setStatus("success");
          setMessage("Already up to date.");
          return true;
        }

        const remote = remoteResult.payload;
        const remoteFp = payloadFingerprint(remote);
        const prefsNow = readPrefs();

        if (remoteFp === prefsNow.lastSyncedFingerprint) {
          applyPrefs({ lastSyncedAt: now });
          writeSyncState(wallet, { lastRevision: event.revision, lastSyncedAt: now });
          setStatus("success");
          setMessage("Already up to date.");
          return true;
        }

        const local = await captureBackupPayload(wallet);
        const localFp = payloadFingerprint(local);
        const localChanged = localFp !== prefsNow.lastSyncedFingerprint;
        const localChangeAt = readSyncState(wallet).lastLocalChangeAt;
        const remoteIsNewer = remoteWinsLastWrite(
          event.updatedAt || remote.capturedAt,
          localChangeAt,
        );

        if (!localChanged || remoteIsNewer) {
          // Last-write-wins: the remote revision is newer → apply it.
          await applyBackupData(wallet, remote.data);
          applyPrefs({ lastSyncedAt: now, lastSyncedFingerprint: remoteFp });
          writeSyncState(wallet, {
            lastRevision: event.revision,
            lastLocalChangeAt: null,
            lastSyncedAt: now,
          });
          setStatus("success");
          setMessage("Updates from another device were applied.");
          return true;
        }

        // Local changes are newer → push them so they win the conflict.
        const uploaded = await uploadBackup(wallet, local);
        if (!uploaded.ok) {
          noteOfflineQueue(wallet);
          setStatus("error");
          setMessage(uploaded.error ?? "Could not sync your changes.");
          return false;
        }
        applyPrefs({
          lastBackupAt: local.capturedAt,
          lastSyncedAt: now,
          lastSyncedFingerprint: localFp,
        });
        writeSyncState(wallet, {
          lastRevision: event.revision,
          lastLocalChangeAt: null,
          lastSyncedAt: now,
        });
        setStatus("success");
        setMessage("Your changes were synced to your other devices.");
        return true;
      } catch {
        setStatus("error");
        setMessage("Real-time sync failed unexpectedly.");
        return false;
      } finally {
        busyRef.current = false;
      }
    },
    [wallet, applyPrefs],
  );

  // ── Automatic sync (push local, pull cloud, or surface a conflict) ────────
  const runAutoSync = useCallback(async (): Promise<void> => {
    if (!wallet || busyRef.current) return;
    busyRef.current = true;
    setStatus("syncing");
    setMessage("");
    try {
      const local = await captureBackupPayload(wallet);
      const localFp = payloadFingerprint(local);
      const syncedFp = readPrefs().lastSyncedFingerprint;

      const remoteResult = await downloadBackup(wallet);

      if (!remoteResult.ok) {
        if (remoteResult.status === 404) {
          const uploaded = await uploadBackup(wallet, local);
          if (!uploaded.ok) {
            noteOfflineQueue(wallet);
            setStatus("error");
            setMessage(uploaded.error ?? "Automatic sync failed.");
            return;
          }
          const now = new Date().toISOString();
          applyPrefs({ lastBackupAt: now, lastSyncedAt: now, lastSyncedFingerprint: localFp });
          setStatus("success");
          setMessage("First cloud backup created.");
          return;
        }
        setStatus("error");
        setMessage(remoteResult.error ?? "Automatic sync failed.");
        return;
      }

      const remote = remoteResult.payload as BackupPayload;
      const remoteFp = payloadFingerprint(remote);

      if (localFp === remoteFp) {
        applyPrefs({ lastSyncedAt: new Date().toISOString(), lastSyncedFingerprint: localFp });
        setStatus("success");
        setMessage("Synced — already up to date.");
        return;
      }

      const localChanged = localFp !== syncedFp;
      const remoteChanged = remoteFp !== syncedFp;

      if (localChanged && remoteChanged) {
        setConflict(buildConflict(local, remote));
        setStatus("idle");
        setMessage("Another device changed your data. Resolve the conflict to sync.");
        return;
      }

      if (localChanged) {
        const uploaded = await uploadBackup(wallet, local);
        if (!uploaded.ok) {
          noteOfflineQueue(wallet);
          setStatus("error");
          setMessage(uploaded.error ?? "Sync upload failed.");
          return;
        }
        const now = new Date().toISOString();
        applyPrefs({ lastBackupAt: now, lastSyncedAt: now, lastSyncedFingerprint: localFp });
        setStatus("success");
        setMessage("Changes backed up to the cloud.");
        return;
      }

      // Only the cloud changed → apply it locally.
      await applyBackupData(wallet, remote.data);
      applyPrefs({ lastSyncedAt: new Date().toISOString(), lastSyncedFingerprint: remoteFp });
      setStatus("success");
      setMessage("Changes from another device restored.");
    } catch {
      setStatus("error");
      setMessage("Automatic sync failed unexpectedly.");
    } finally {
      busyRef.current = false;
    }
  }, [wallet, applyPrefs, buildConflict]);

  // Run once shortly after enabling, then every 5 minutes while enabled.
  useEffect(() => {
    if (!prefs.enabled || !wallet) return undefined;
    const initial = setTimeout(() => {
      void runAutoSync();
    }, 1500);
    const interval = setInterval(() => {
      void runAutoSync();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [prefs.enabled, wallet, runAutoSync]);

  const isBusy =
    status === "syncing" || status === "backing-up" || status === "restoring";

  return {
    isEnabled: prefs.enabled,
    lastBackupAt: prefs.lastBackupAt,
    lastSyncedAt: prefs.lastSyncedAt,
    status,
    message,
    isBusy,
    conflict,
    setEnabled,
    backupNow,
    restoreNow,
    resolveConflict,
    cancelConflict,
    syncNow: runAutoSync,
    applyRemoteRevision,
  };
}
