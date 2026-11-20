/**
 * Server-side store for cross-device synchronization.
 *
 * Mirrors the patterns used by `app/api/backup/store.ts` and
 * `lib/notifications/server-store.ts`:
 *   • a wallet-keyed device registry (which devices are enrolled in sync),
 *   • a per-wallet monotonic revision counter (last-write-wins ordering),
 *   • an in-memory pub/sub bus that fans revisions out to connected devices
 *     via the SSE stream at `app/api/sync/stream/route.ts`.
 *
 * Privacy: only opaque metadata (device labels, revisions, timestamps) lives
 * here — never user content. The encrypted snapshot itself stays in the
 * backup store and is only ever decrypted on the client.
 *
 * Persistence is intentionally in-memory (matching the backup store) so the
 * feature works without a database. Swap the Maps for a real KV/DB + pub/sub
 * (e.g. Redis) in production without changing the route contracts.
 */

import { isValidWalletAddress } from "../backup/store";

/** Maximum number of devices tracked per wallet (oldest evicted past this). */
export const MAX_SYNC_DEVICES = 10;

/** A device is considered "online" if it was seen within this window. */
export const DEVICE_STALE_MS = 2 * 60 * 1000; // 2 minutes

export interface SyncDevice {
  deviceId: string;
  walletAddress: string;
  /** Human-readable device label, e.g. "Chrome on macOS". */
  label: string;
  createdAt: string;
  lastSeenAt: string;
}

/** Public-safe device view returned by the devices API. */
export interface SyncDeviceView {
  deviceId: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  /** True when the device was seen recently enough to be considered live. */
  online: boolean;
  /** True for the device making the request. */
  isCurrent?: boolean;
}

export type SyncEventKind = "revision" | "device-revoked" | "device-registered";

/** A single real-time event fanned out over the SSE stream. */
export interface SyncEvent {
  id: string;
  walletAddress: string;
  kind: SyncEventKind;
  /** Origin device (revision/registered) or target device (revoked). */
  deviceId: string;
  /** Server-assigned, strictly increasing per wallet. 0 for non-revision events. */
  revision: number;
  /** When the originating client captured the snapshot (ISO timestamp). */
  capturedAt: string;
  /** When the server processed the event (ISO timestamp). */
  updatedAt: string;
  /** Ciphertext size in characters (revision events only). */
  size?: number;
}

type Listener = (event: SyncEvent) => void;

// Map<walletAddress, Map<deviceId, SyncDevice>>
const devices = new Map<string, Map<string, SyncDevice>>();
// Map<walletAddress, revision>
const revisions = new Map<string, number>();
// Map<walletAddress, Set<Listener>>
const listeners = new Map<string, Set<Listener>>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a human-readable device label from a User-Agent string. */
export function buildDeviceLabel(ua: string): string {
  const lower = ua.toLowerCase();
  let browser = "Browser";
  let os = "Unknown OS";

  if (lower.includes("edg/") || lower.includes("edge/")) browser = "Edge";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("chrome/")) browser = "Chrome";
  else if (lower.includes("safari/")) browser = "Safari";

  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("iphone")) os = "iPhone";
  else if (lower.includes("ipad")) os = "iPad";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("linux")) os = "Linux";

  return `${browser} on ${os}`;
}

function deviceMap(walletAddress: string): Map<string, SyncDevice> {
  let map = devices.get(walletAddress);
  if (!map) {
    map = new Map();
    devices.set(walletAddress, map);
  }
  return map;
}

function isOnline(device: SyncDevice): boolean {
  return Date.now() - new Date(device.lastSeenAt).getTime() < DEVICE_STALE_MS;
}

// ─── Device registry ──────────────────────────────────────────────────────────

/**
 * Register (or refresh) a device for a wallet. Returns the stored device.
 * When the per-wallet cap is exceeded the least-recently-seen device is evicted.
 */
export function registerSyncDevice(
  walletAddress: string,
  deviceId: string,
  label?: string,
): SyncDevice {
  const map = deviceMap(walletAddress);
  const now = new Date().toISOString();
  const existing = map.get(deviceId);

  const device: SyncDevice = {
    deviceId,
    walletAddress,
    label: label && label.trim() ? label.trim().slice(0, 64) : existing?.label ?? "Unknown device",
    createdAt: existing?.createdAt ?? now,
    lastSeenAt: now,
  };
  map.set(deviceId, device);

  // Evict the oldest device if we are over the cap.
  if (map.size > MAX_SYNC_DEVICES) {
    const oldest = [...map.values()].sort(
      (a, b) => new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime(),
    )[0];
    if (oldest && oldest.deviceId !== deviceId) map.delete(oldest.deviceId);
  }

  return device;
}

/** Refresh a device's presence timestamp (heartbeat / stream connect). */
export function touchSyncDevice(walletAddress: string, deviceId: string): void {
  const device = deviceMap(walletAddress).get(deviceId);
  if (device) device.lastSeenAt = new Date().toISOString();
}

/** List devices for a wallet, newest-seen first. */
export function listSyncDevices(
  walletAddress: string,
  currentDeviceId?: string,
): SyncDeviceView[] {
  return [...deviceMap(walletAddress).values()]
    .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
    .map((device) => ({
      deviceId: device.deviceId,
      label: device.label,
      createdAt: device.createdAt,
      lastSeenAt: device.lastSeenAt,
      online: isOnline(device),
      isCurrent: device.deviceId === currentDeviceId,
    }));
}

/** Remove a single device. Returns true when one existed. */
export function removeSyncDevice(walletAddress: string, deviceId: string): boolean {
  return deviceMap(walletAddress).delete(deviceId);
}

/**
 * Remove every device for a wallet except `keepDeviceId`.
 * Returns the ids that were revoked so the caller can notify them.
 */
export function revokeOtherSyncDevices(walletAddress: string, keepDeviceId: string): string[] {
  const map = deviceMap(walletAddress);
  const revoked: string[] = [];
  for (const deviceId of [...map.keys()]) {
    if (deviceId === keepDeviceId) continue;
    map.delete(deviceId);
    revoked.push(deviceId);
  }
  return revoked;
}

/** Whether a device is currently enrolled for a wallet. */
export function isSyncDeviceEnrolled(walletAddress: string, deviceId: string): boolean {
  return deviceMap(walletAddress).has(deviceId);
}

// ─── Revisions (last-write-wins ordering) ─────────────────────────────────────

/** Return the current revision for a wallet (0 when none). */
export function getRevision(walletAddress: string): number {
  return revisions.get(walletAddress) ?? 0;
}

/** Increment and return the next revision for a wallet. */
export function nextRevision(walletAddress: string): number {
  const next = getRevision(walletAddress) + 1;
  revisions.set(walletAddress, next);
  return next;
}

// ─── Pub/sub ──────────────────────────────────────────────────────────────────

/** Fan a sync event out to every device subscribed for the wallet. */
export function publishSyncEvent(event: SyncEvent): void {
  const subs = listeners.get(event.walletAddress);
  if (!subs) return;
  for (const listener of subs) {
    try {
      listener(event);
    } catch (error) {
      console.error("[sync] subscriber failed", error);
    }
  }
}

/**
 * Record a new revision for a wallet and notify all connected devices.
 * Called after a backup upload so other devices pull the new data.
 */
export function publishRevision(
  walletAddress: string,
  deviceId: string,
  capturedAt: string,
  size?: number,
): SyncEvent {
  const now = new Date().toISOString();
  const event: SyncEvent = {
    id: crypto.randomUUID(),
    walletAddress,
    kind: "revision",
    deviceId,
    revision: nextRevision(walletAddress),
    capturedAt: capturedAt || now,
    updatedAt: now,
    ...(typeof size === "number" ? { size } : {}),
  };
  publishSyncEvent(event);
  return event;
}

/** Notify the wallet that a device was signed out. */
export function publishDeviceRevoked(
  walletAddress: string,
  revokedDeviceId: string,
): SyncEvent {
  const now = new Date().toISOString();
  const event: SyncEvent = {
    id: crypto.randomUUID(),
    walletAddress,
    kind: "device-revoked",
    deviceId: revokedDeviceId,
    revision: 0,
    capturedAt: now,
    updatedAt: now,
  };
  publishSyncEvent(event);
  return event;
}

export function subscribeSync(walletAddress: string, listener: Listener): () => void {
  let set = listeners.get(walletAddress);
  if (!set) {
    set = new Set();
    listeners.set(walletAddress, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) listeners.delete(walletAddress);
  };
}

export function subscriberCount(): number {
  let total = 0;
  for (const set of listeners.values()) total += set.size;
  return total;
}

/** Test helper — not for production request handlers. */
export function resetSyncStoreForTests(): void {
  devices.clear();
  revisions.clear();
  listeners.clear();
}

export { isValidWalletAddress };
