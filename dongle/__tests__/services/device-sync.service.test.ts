import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SYNC_QUEUE_KEY,
  SYNC_STATE_KEY,
  clearSyncQueue,
  enqueueSyncItem,
  fetchSyncDevices,
  queueLocalChange,
  readSyncQueue,
  readSyncState,
  registerSyncDevice,
  remoteWinsLastWrite,
  revokeOtherSyncDevices,
  syncQueueSize,
  writeSyncState,
} from "@/services/sync/device-sync.service";

const WALLET_A = `G${"A".repeat(55)}`;
const WALLET_B = `G${"B".repeat(55)}`;

describe("device-sync.service — last-write-wins", () => {
  it("lets the remote win when this device has no unsynced change", () => {
    expect(remoteWinsLastWrite("2026-01-01T00:00:10.000Z", null)).toBe(true);
  });

  it("lets the newer remote revision win", () => {
    expect(
      remoteWinsLastWrite("2026-01-01T00:00:20.000Z", "2026-01-01T00:00:10.000Z"),
    ).toBe(true);
  });

  it("lets a newer local change win", () => {
    expect(
      remoteWinsLastWrite("2026-01-01T00:00:10.000Z", "2026-01-01T00:00:20.000Z"),
    ).toBe(false);
  });

  it("breaks ties in favour of the remote (server) revision", () => {
    expect(
      remoteWinsLastWrite("2026-01-01T00:00:10.000Z", "2026-01-01T00:00:10.000Z"),
    ).toBe(true);
  });

  it("handles unparseable timestamps deterministically", () => {
    expect(remoteWinsLastWrite("not-a-date", "2026-01-01T00:00:10.000Z")).toBe(false);
    expect(remoteWinsLastWrite("2026-01-01T00:00:10.000Z", "not-a-date")).toBe(true);
  });
});

describe("device-sync.service — offline queue", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("coalesces pending syncs to a single entry per wallet", () => {
    enqueueSyncItem(WALLET_A, "dev-1", "local-change");
    enqueueSyncItem(WALLET_A, "dev-1", "remote-revision");

    const queue = readSyncQueue(WALLET_A);
    expect(queue).toHaveLength(1);
    expect(queue[0].reason).toBe("remote-revision");
    expect(syncQueueSize(WALLET_A)).toBe(1);
  });

  it("keeps queues isolated per wallet", () => {
    enqueueSyncItem(WALLET_A, "dev-1", "local-change");
    enqueueSyncItem(WALLET_B, "dev-2", "local-change");

    expect(readSyncQueue(WALLET_A)).toHaveLength(1);
    expect(readSyncQueue(WALLET_B)).toHaveLength(1);
    expect(readSyncQueue(WALLET_A)[0].deviceId).toBe("dev-1");
  });

  it("clears only the target wallet's queue", () => {
    enqueueSyncItem(WALLET_A, "dev-1", "local-change");
    enqueueSyncItem(WALLET_B, "dev-2", "local-change");

    clearSyncQueue(WALLET_A);

    expect(syncQueueSize(WALLET_A)).toBe(0);
    expect(syncQueueSize(WALLET_B)).toBe(1);
  });

  it("queueLocalChange records this device's pending change", () => {
    queueLocalChange(WALLET_A);
    const queue = readSyncQueue(WALLET_A);
    expect(queue).toHaveLength(1);
    expect(queue[0].reason).toBe("local-change");
    expect(queue[0].walletAddress).toBe(WALLET_A);
  });

  it("survives a corrupted queue payload", () => {
    localStorage.setItem(SYNC_QUEUE_KEY, "{not json");
    expect(readSyncQueue(WALLET_A)).toEqual([]);
  });
});

describe("device-sync.service — sync state", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults for an unknown wallet", () => {
    expect(readSyncState(WALLET_A)).toEqual({
      lastRevision: 0,
      lastLocalChangeAt: null,
      lastSyncedAt: null,
    });
  });

  it("merges patches into the stored state", () => {
    writeSyncState(WALLET_A, { lastRevision: 3 });
    const next = writeSyncState(WALLET_A, { lastSyncedAt: "2026-01-01T00:00:00.000Z" });

    expect(next.lastRevision).toBe(3);
    expect(next.lastSyncedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(readSyncState(WALLET_A).lastRevision).toBe(3);
  });

  it("tolerates a corrupted state payload", () => {
    localStorage.setItem(SYNC_STATE_KEY, "[]");
    expect(readSyncState(WALLET_A).lastRevision).toBe(0);
  });
});

describe("device-sync.service — device registry transport", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns the device list on a successful registration", async () => {
    const devices = [
      {
        deviceId: "dev-1",
        label: "Chrome on Windows",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: "2026-01-01T00:00:00.000Z",
        online: true,
        isCurrent: true,
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ devices }) }),
    );

    await expect(registerSyncDevice(WALLET_A, "Chrome on Windows")).resolves.toEqual(devices);
  });

  it("returns null when the registry request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    await expect(fetchSyncDevices(WALLET_A)).resolves.toBeNull();
  });

  it("returns null when the network throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(revokeOtherSyncDevices(WALLET_A)).resolves.toBeNull();
  });
});
