"use client";

/**
 * useDeviceSync
 *
 * Real-time cross-device synchronization hook. While a wallet is connected (and
 * cloud backup is enabled) it:
 *   • enrolls this device in the wallet's sync registry,
 *   • subscribes to the wallet's Server-Sent Events stream,
 *   • reconciles revisions pushed by other devices (last-write-wins),
 *   • queues changes while offline and flushes them on reconnect,
 *   • exposes device management ("sign out all other devices").
 *
 * The stream only carries opaque metadata; the encrypted snapshot itself is
 * pulled through the existing cloud-backup transport via `onRemoteRevision`.
 *
 * All state is stored as a single wallet-keyed snapshot so it can be derived
 * during render (never written synchronously from an effect).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateDeviceId } from "@/services/backup/cloud-backup.service";
import {
  clearSyncQueue,
  enqueueSyncItem,
  fetchSyncDevices,
  openSyncStream,
  registerSyncDevice,
  revokeOtherSyncDevices,
  syncQueueSize,
  type SyncDeviceView,
  type SyncStreamEvent,
} from "@/services/sync/device-sync.service";

/** Coarse sync status driving the "Synced / Syncing / Sync failed" indicator. */
export type SyncStatus = "disabled" | "offline" | "syncing" | "synced" | "failed";

export interface UseDeviceSyncOptions {
  /** Gate the stream behind the cloud-backup opt-in. Defaults to true. */
  enabled?: boolean;
  /** Reconcile a revision published by another device. */
  onRemoteRevision?: (event: SyncStreamEvent) => Promise<boolean> | boolean | void;
  /** Called when this device is signed out from another device. */
  onRevoked?: () => void;
  /** Flush queued offline changes once connectivity returns. */
  onFlush?: () => Promise<void> | void;
}

export interface UseDeviceSyncResult {
  status: SyncStatus;
  devices: SyncDeviceView[];
  deviceId: string;
  pendingCount: number;
  lastRevision: number;
  refreshDevices: () => Promise<void>;
  signOutOtherDevices: () => Promise<number>;
  queueLocalChange: () => void;
}

const EMPTY_DEVICES: SyncDeviceView[] = [];

function currentOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** Everything the stream reports, tagged with the wallet it belongs to. */
interface SyncSnapshot {
  wallet: string;
  status: SyncStatus;
  devices: SyncDeviceView[];
  pending: number;
  revision: number;
}

export function useDeviceSync(
  wallet: string | null | undefined,
  options: UseDeviceSyncOptions = {},
): UseDeviceSyncResult {
  const { enabled = true } = options;

  const [online, setOnline] = useState(currentOnline);
  const [snapshot, setSnapshot] = useState<SyncSnapshot | null>(null);
  const [deviceId] = useState<string>(() =>
    typeof window === "undefined" ? "server" : getOrCreateDeviceId(),
  );

  const isActive = Boolean(wallet && enabled);
  const active = isActive && snapshot !== null && snapshot.wallet === wallet ? snapshot : null;

  // Derived during render: no synchronous state writes from effects.
  const status: SyncStatus = !isActive
    ? "disabled"
    : active
      ? active.status
      : online
        ? "syncing"
        : "offline";
  const devices = active ? active.devices : EMPTY_DEVICES;
  const pendingCount = active ? active.pending : 0;
  const lastRevision = active ? active.revision : 0;

  // Latest connectivity + callbacks, readable from stream callbacks without
  // re-opening the stream on every render.
  const onlineRef = useRef(currentOnline());
  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  });

  // ── Stream + device registration ──────────────────────────────────────────
  useEffect(() => {
    if (!wallet || !enabled) return undefined;

    const id = getOrCreateDeviceId();
    let cancelled = false;

    const update = (patch: Partial<Omit<SyncSnapshot, "wallet">>) => {
      if (cancelled) return;
      setSnapshot((prev) => {
        const base: SyncSnapshot =
          prev && prev.wallet === wallet
            ? prev
            : {
                wallet,
                status: currentOnline() ? "syncing" : "offline",
                devices: [],
                pending: syncQueueSize(wallet),
                revision: 0,
              };
        return { ...base, ...patch, wallet };
      });
    };

    void registerSyncDevice(wallet).then((list) => {
      if (list) update({ devices: list, pending: syncQueueSize(wallet) });
    });

    const close = openSyncStream(wallet, {
      onReady: (ready) => {
        update({
          devices: ready.devices,
          revision: ready.revision,
          status: onlineRef.current ? "synced" : "offline",
        });
      },
      onEvent: (event) => {
        if (event.kind === "device-revoked") {
          if (event.deviceId === id) {
            callbacksRef.current.onRevoked?.();
            update({ status: "disabled" });
          } else {
            setSnapshot((prev) =>
              prev && prev.wallet === wallet
                ? {
                    ...prev,
                    devices: prev.devices.filter((device) => device.deviceId !== event.deviceId),
                  }
                : prev,
            );
          }
          return;
        }

        if (event.kind === "device-registered") {
          void fetchSyncDevices(wallet).then((list) => {
            if (list) update({ devices: list });
          });
          return;
        }

        // Revision published by another device.
        if (event.deviceId === id) return; // our own upload
        update({ revision: event.revision });

        if (!onlineRef.current) {
          enqueueSyncItem(wallet, id, "remote-revision");
          update({ status: "offline", pending: syncQueueSize(wallet) });
          return;
        }

        update({ status: "syncing" });
        Promise.resolve(callbacksRef.current.onRemoteRevision?.(event))
          .then((ok) => update({ status: ok === false ? "failed" : "synced" }))
          .catch(() => update({ status: "failed" }));
      },
      onError: () => {
        // EventSource reconnects automatically; reflect the outage in the UI.
        update({ status: onlineRef.current ? "failed" : "offline" });
      },
    });

    return () => {
      cancelled = true;
      close();
    };
  }, [wallet, enabled]);

  // ── Connectivity: flush the offline queue on reconnect ────────────────────
  useEffect(() => {
    const handleOnline = () => {
      onlineRef.current = true;
      setOnline(true);
      if (!wallet || !enabled) return;

      const pending = syncQueueSize(wallet);
      setSnapshot((prev) =>
        prev && prev.wallet === wallet
          ? { ...prev, pending, status: pending === 0 ? "synced" : "syncing" }
          : prev,
      );
      if (pending === 0) return;

      Promise.resolve(callbacksRef.current.onFlush?.())
        .then(() => {
          clearSyncQueue(wallet);
          setSnapshot((prev) =>
            prev && prev.wallet === wallet ? { ...prev, pending: 0, status: "synced" } : prev,
          );
        })
        .catch(() =>
          setSnapshot((prev) =>
            prev && prev.wallet === wallet ? { ...prev, status: "failed" } : prev,
          ),
        );
    };

    const handleOffline = () => {
      onlineRef.current = false;
      setOnline(false);
      if (!wallet || !enabled) return;
      setSnapshot((prev) =>
        prev && prev.wallet === wallet ? { ...prev, status: "offline" } : prev,
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wallet, enabled]);

  // ── Device management ─────────────────────────────────────────────────────
  const refreshDevices = useCallback(async (): Promise<void> => {
    if (!wallet) return;
    const list = await fetchSyncDevices(wallet);
    if (list) {
      setSnapshot((prev) => (prev && prev.wallet === wallet ? { ...prev, devices: list } : prev));
    }
  }, [wallet]);

  const signOutOtherDevices = useCallback(async (): Promise<number> => {
    if (!wallet) return 0;
    const result = await revokeOtherSyncDevices(wallet);
    if (!result) return 0;
    setSnapshot((prev) =>
      prev && prev.wallet === wallet ? { ...prev, devices: result.devices } : prev,
    );
    return result.revoked;
  }, [wallet]);

  const queueLocalChange = useCallback((): void => {
    if (!wallet) return;
    enqueueSyncItem(wallet, getOrCreateDeviceId(), "local-change");
    setSnapshot((prev) =>
      prev && prev.wallet === wallet
        ? {
            ...prev,
            pending: syncQueueSize(wallet),
            status: onlineRef.current ? prev.status : "offline",
          }
        : prev,
    );
  }, [wallet]);

  return {
    status,
    devices,
    deviceId,
    pendingCount,
    lastRevision,
    refreshDevices,
    signOutOtherDevices,
    queueLocalChange,
  };
}
