/**
 * Device Sync Service — client transport for real-time cross-device sync.
 *
 * Builds on the encrypted cloud-backup snapshot (`cloud-backup.service.ts`)
 * and adds the real-time channel plus the offline queue:
 *
 *   • a per-wallet device registry (list / register / sign out others),
 *   • a Server-Sent Events subscription that signals new revisions,
 *   • an offline queue that coalesces pending syncs while disconnected,
 *   • a last-write-wins timestamp helper for reconciliation.
 *
 * Everything here is client-only and safe to import from client components.
 * No user content is ever sent to these endpoints — only opaque metadata.
 */

import { getOrCreateDeviceId } from "@/services/backup/cloud-backup.service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key holding the pending sync queue (per wallet). */
export const SYNC_QUEUE_KEY = "dongle_sync_queue";

/** localStorage key holding per-wallet sync bookkeeping (revision, timestamps). */
export const SYNC_STATE_KEY = "dongle_sync_state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A device enrolled in sync for a wallet, as returned by the devices API. */
export interface SyncDeviceView {
  deviceId: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  online: boolean;
  isCurrent?: boolean;
}

export type SyncEventKind = "revision" | "device-revoked" | "device-registered";

/** Real-time event delivered over the SSE stream. */
export interface SyncStreamEvent {
  id: string;
  walletAddress: string;
  kind: SyncEventKind;
  deviceId: string;
  revision: number;
  capturedAt: string;
  updatedAt: string;
  size?: number;
}

/** Payload of the `ready` event sent when the stream connects. */
export interface SyncStreamReady {
  revision: number;
  devices: SyncDeviceView[];
  label: string;
}

/** A pending sync action stored while offline / between syncs. */
export interface QueuedSyncItem {
  id: string;
  walletAddress: string;
  deviceId: string;
  reason: "local-change" | "remote-revision";
  queuedAt: string;
}

/** Per-wallet sync bookkeeping (never uploaded). */
export interface DeviceSyncState {
  /** Last server revision this device has fully reconciled. */
  lastRevision: number;
  /** When this device's local data last changed (ISO timestamp). */
  lastLocalChangeAt: string | null;
  /** When this device last reconciled successfully (ISO timestamp). */
  lastSyncedAt: string | null;
}

export interface SyncStreamHandlers {
  onReady?: (ready: SyncStreamReady) => void;
  onEvent?: (event: SyncStreamEvent) => void;
  /** Called when the connection drops (EventSource retries automatically). */
  onError?: () => void;
}

// ---------------------------------------------------------------------------
// Small local-storage helpers
// ---------------------------------------------------------------------------

function readLocalRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalRaw(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Storage is optional */
  }
}

// ---------------------------------------------------------------------------
// Offline queue
// ---------------------------------------------------------------------------

function readQueueAll(): QueuedSyncItem[] {
  const raw = readLocalRaw(SYNC_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedSyncItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueueAll(items: QueuedSyncItem[]): void {
  writeLocalRaw(SYNC_QUEUE_KEY, items.length ? JSON.stringify(items) : null);
}

/** Pending sync items for a wallet. */
export function readSyncQueue(wallet: string): QueuedSyncItem[] {
  return readQueueAll().filter((item) => item.walletAddress === wallet);
}

/**
 * Queue a sync for a wallet. The queue coalesces to a single entry per wallet
 * (the sync unit is a whole snapshot), so repeated changes don't pile up.
 */
export function enqueueSyncItem(
  wallet: string,
  deviceId: string,
  reason: QueuedSyncItem["reason"],
): QueuedSyncItem {
  const item: QueuedSyncItem = {
    id: `sync_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    walletAddress: wallet,
    deviceId,
    reason,
    queuedAt: new Date().toISOString(),
  };
  const others = readQueueAll().filter((entry) => entry.walletAddress !== wallet);
  writeQueueAll([...others, item]);
  return item;
}

/** Remove queued syncs for a wallet (called after a successful sync). */
export function clearSyncQueue(wallet: string): void {
  writeQueueAll(readQueueAll().filter((entry) => entry.walletAddress !== wallet));
}

/** Number of pending syncs for a wallet (0 or 1). */
export function syncQueueSize(wallet: string): number {
  return readSyncQueue(wallet).length;
}

/**
 * Queue this device's local changes for a later sync. Used when a push fails
 * while offline so the change is not lost — it is flushed on reconnect.
 */
export function queueLocalChange(wallet: string): void {
  enqueueSyncItem(wallet, getOrCreateDeviceId(), "local-change");
}

// ---------------------------------------------------------------------------
// Sync state (revision + local change tracking)
// ---------------------------------------------------------------------------

const DEFAULT_SYNC_STATE: DeviceSyncState = {
  lastRevision: 0,
  lastLocalChangeAt: null,
  lastSyncedAt: null,
};

function readStateAll(): Record<string, DeviceSyncState> {
  const raw = readLocalRaw(SYNC_STATE_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, DeviceSyncState>) : {};
  } catch {
    return {};
  }
}

export function readSyncState(wallet: string): DeviceSyncState {
  const stored = readStateAll()[wallet];
  if (!stored) return { ...DEFAULT_SYNC_STATE };
  return {
    lastRevision: typeof stored.lastRevision === "number" ? stored.lastRevision : 0,
    lastLocalChangeAt:
      typeof stored.lastLocalChangeAt === "string" ? stored.lastLocalChangeAt : null,
    lastSyncedAt: typeof stored.lastSyncedAt === "string" ? stored.lastSyncedAt : null,
  };
}

export function writeSyncState(wallet: string, patch: Partial<DeviceSyncState>): DeviceSyncState {
  const next = { ...readSyncState(wallet), ...patch };
  const all = readStateAll();
  all[wallet] = next;
  writeLocalRaw(SYNC_STATE_KEY, JSON.stringify(all));
  return next;
}

// ---------------------------------------------------------------------------
// Last-write-wins
// ---------------------------------------------------------------------------

/**
 * Resolve a divergence using last-write-wins with timestamps.
 *
 * Returns true when the remote revision should win (i.e. it is newer than the
 * local change, or the local device has no unsynced changes). Ties go to the
 * remote/server revision so the outcome is deterministic across devices.
 */
export function remoteWinsLastWrite(
  remoteUpdatedAt: string,
  localChangedAt: string | null,
): boolean {
  if (!localChangedAt) return true;
  const remote = Date.parse(remoteUpdatedAt);
  const local = Date.parse(localChangedAt);
  if (Number.isNaN(remote)) return false;
  if (Number.isNaN(local)) return true;
  return remote >= local;
}

// ---------------------------------------------------------------------------
// Transport — device registry
// ---------------------------------------------------------------------------

/** Register (or heartbeat) this device, returning the current device list. */
export async function registerSyncDevice(
  wallet: string,
  label?: string,
): Promise<SyncDeviceView[] | null> {
  try {
    const response = await fetch("/api/sync/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: wallet, deviceId: getOrCreateDeviceId(), label }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { devices?: SyncDeviceView[] };
    return body.devices ?? [];
  } catch {
    return null;
  }
}

/** Fetch the enrolled devices for a wallet. */
export async function fetchSyncDevices(wallet: string): Promise<SyncDeviceView[] | null> {
  try {
    const params = new URLSearchParams({
      walletAddress: wallet,
      deviceId: getOrCreateDeviceId(),
    });
    const response = await fetch(`/api/sync/devices?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as { devices?: SyncDeviceView[] };
    return body.devices ?? [];
  } catch {
    return null;
  }
}

/** Sign out every other device for this wallet. */
export async function revokeOtherSyncDevices(
  wallet: string,
): Promise<{ revoked: number; devices: SyncDeviceView[] } | null> {
  try {
    const params = new URLSearchParams({
      walletAddress: wallet,
      deviceId: getOrCreateDeviceId(),
    });
    const response = await fetch(`/api/sync/devices?${params.toString()}`, {
      method: "DELETE",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { revoked?: number; devices?: SyncDeviceView[] };
    return { revoked: body.revoked ?? 0, devices: body.devices ?? [] };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Transport — real-time stream
// ---------------------------------------------------------------------------

/**
 * Open the SSE sync stream for a wallet. Returns a close function.
 * No-op (returns an inert closer) when EventSource is unavailable.
 */
export function openSyncStream(
  wallet: string,
  handlers: SyncStreamHandlers,
): () => void {
  if (typeof EventSource === "undefined") return () => {};

  const params = new URLSearchParams({
    walletAddress: wallet,
    deviceId: getOrCreateDeviceId(),
  });
  const source = new EventSource(`/api/sync/stream?${params.toString()}`);

  const handleReady = (event: MessageEvent) => {
    try {
      handlers.onReady?.(JSON.parse(event.data) as SyncStreamReady);
    } catch {
      /* ignore malformed frame */
    }
  };

  const handleSync = (event: MessageEvent) => {
    try {
      handlers.onEvent?.(JSON.parse(event.data) as SyncStreamEvent);
    } catch {
      /* ignore malformed frame */
    }
  };

  const handleError = () => {
    handlers.onError?.();
  };

  source.addEventListener("ready", handleReady as EventListener);
  source.addEventListener("sync", handleSync as EventListener);
  source.addEventListener("error", handleError);

  return () => {
    source.removeEventListener("ready", handleReady as EventListener);
    source.removeEventListener("sync", handleSync as EventListener);
    source.removeEventListener("error", handleError);
    source.close();
  };
}
