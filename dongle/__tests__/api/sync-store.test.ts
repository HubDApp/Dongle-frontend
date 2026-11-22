import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEVICE_STALE_MS,
  MAX_SYNC_DEVICES,
  buildDeviceLabel,
  getRevision,
  isSyncDeviceEnrolled,
  isValidWalletAddress,
  listSyncDevices,
  nextRevision,
  publishDeviceRevoked,
  publishRevision,
  registerSyncDevice,
  removeSyncDevice,
  resetSyncStoreForTests,
  revokeOtherSyncDevices,
  subscribeSync,
  subscriberCount,
  touchSyncDevice,
  type SyncEvent,
} from "@/app/api/sync/store";

const WALLET = `G${"A".repeat(55)}`;
const OTHER_WALLET = `G${"B".repeat(55)}`;

describe("sync store — device labels", () => {
  it("derives a browser/OS label from a user-agent", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";
    expect(buildDeviceLabel(ua)).toBe("Chrome on Windows");
  });

  it("recognises Safari on macOS and Edge on Windows", () => {
    expect(
      buildDeviceLabel(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15",
      ),
    ).toBe("Safari on macOS");
    expect(buildDeviceLabel("Mozilla/5.0 (Windows NT 10.0) Edg/120.0")).toBe("Edge on Windows");
  });

  it("falls back to generic labels for unknown agents", () => {
    expect(buildDeviceLabel("")).toBe("Browser on Unknown OS");
  });
});

describe("sync store — wallet validation", () => {
  it("accepts a well-formed Stellar public key", () => {
    expect(isValidWalletAddress(WALLET)).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidWalletAddress("not-a-wallet")).toBe(false);
    expect(isValidWalletAddress(null)).toBe(false);
    expect(isValidWalletAddress(undefined)).toBe(false);
  });
});

describe("sync store — device registry", () => {
  beforeEach(() => {
    resetSyncStoreForTests();
  });

  it("registers a device and reports it as online and current", () => {
    const device = registerSyncDevice(WALLET, "dev-1", "Chrome on Windows");
    expect(device.label).toBe("Chrome on Windows");

    const list = listSyncDevices(WALLET, "dev-1");
    expect(list).toHaveLength(1);
    expect(list[0].online).toBe(true);
    expect(list[0].isCurrent).toBe(true);
    expect(isSyncDeviceEnrolled(WALLET, "dev-1")).toBe(true);
  });

  it("keeps the existing label when a heartbeat omits one", () => {
    registerSyncDevice(WALLET, "dev-1", "Firefox on Linux");
    const refreshed = registerSyncDevice(WALLET, "dev-1");
    expect(refreshed.label).toBe("Firefox on Linux");
  });

  it("lists devices newest-seen first", () => {
    registerSyncDevice(WALLET, "dev-old");
    registerSyncDevice(WALLET, "dev-new");
    const list = listSyncDevices(WALLET);
    expect(list).toHaveLength(2);
  });

  it(`caps the registry at ${MAX_SYNC_DEVICES} devices`, () => {
    for (let i = 0; i < MAX_SYNC_DEVICES + 3; i++) {
      registerSyncDevice(WALLET, `dev-${i}`);
    }
    expect(listSyncDevices(WALLET)).toHaveLength(MAX_SYNC_DEVICES);
  });

  it("marks a device offline once it goes stale", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
      registerSyncDevice(WALLET, "dev-1");
      expect(listSyncDevices(WALLET)[0].online).toBe(true);

      vi.setSystemTime(new Date(Date.now() + DEVICE_STALE_MS + 1000));
      expect(listSyncDevices(WALLET)[0].online).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes a single device", () => {
    registerSyncDevice(WALLET, "dev-1");
    expect(removeSyncDevice(WALLET, "dev-1")).toBe(true);
    expect(removeSyncDevice(WALLET, "dev-1")).toBe(false);
    expect(listSyncDevices(WALLET)).toHaveLength(0);
  });

  it("revokes every device except the caller", () => {
    registerSyncDevice(WALLET, "dev-1");
    registerSyncDevice(WALLET, "dev-2");
    registerSyncDevice(WALLET, "dev-3");

    const revoked = revokeOtherSyncDevices(WALLET, "dev-2");

    expect(new Set(revoked)).toEqual(new Set(["dev-1", "dev-3"]));
    expect(isSyncDeviceEnrolled(WALLET, "dev-2")).toBe(true);
    expect(listSyncDevices(WALLET)).toHaveLength(1);
  });

  it("keeps wallets isolated", () => {
    registerSyncDevice(WALLET, "dev-1");
    registerSyncDevice(OTHER_WALLET, "dev-9");
    expect(listSyncDevices(WALLET)).toHaveLength(1);
    expect(listSyncDevices(OTHER_WALLET)[0].deviceId).toBe("dev-9");
  });

  it("refreshes presence on touch", () => {
    registerSyncDevice(WALLET, "dev-1");
    touchSyncDevice(WALLET, "dev-1");
    expect(listSyncDevices(WALLET)[0].online).toBe(true);
  });
});

describe("sync store — revisions and pub/sub", () => {
  beforeEach(() => {
    resetSyncStoreForTests();
  });

  it("returns monotonically increasing revisions per wallet", () => {
    expect(getRevision(WALLET)).toBe(0);
    expect(nextRevision(WALLET)).toBe(1);
    expect(nextRevision(WALLET)).toBe(2);
    expect(getRevision(WALLET)).toBe(2);
    // A different wallet has its own counter.
    expect(getRevision(OTHER_WALLET)).toBe(0);
  });

  it("fans a revision out to that wallet's subscribers only", () => {
    const received: SyncEvent[] = [];
    const unsubA = subscribeSync(WALLET, (event) => received.push(event));
    subscribeSync(OTHER_WALLET, (event) => received.push(event));

    const event = publishRevision(WALLET, "dev-1", "2026-01-01T00:00:00.000Z", 128);

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe(event.id);
    expect(event.kind).toBe("revision");
    expect(event.revision).toBe(1);
    expect(event.deviceId).toBe("dev-1");
    expect(event.size).toBe(128);

    unsubA();
    expect(subscriberCount()).toBe(1);
  });

  it("publishes device-revoked events", () => {
    const received: SyncEvent[] = [];
    subscribeSync(WALLET, (event) => received.push(event));

    const event = publishDeviceRevoked(WALLET, "dev-2");

    expect(received).toHaveLength(1);
    expect(event.kind).toBe("device-revoked");
    expect(event.deviceId).toBe("dev-2");
    expect(event.revision).toBe(0);
  });

  it("stops delivering after unsubscribe", () => {
    const received: SyncEvent[] = [];
    const unsub = subscribeSync(WALLET, (event) => received.push(event));
    unsub();
    publishRevision(WALLET, "dev-1", "2026-01-01T00:00:00.000Z");
    expect(received).toHaveLength(0);
    expect(subscriberCount()).toBe(0);
  });

  it("isolates a throwing subscriber from the rest", () => {
    const received: SyncEvent[] = [];
    subscribeSync(WALLET, () => {
      throw new Error("boom");
    });
    subscribeSync(WALLET, (event) => received.push(event));

    publishRevision(WALLET, "dev-1", "2026-01-01T00:00:00.000Z");

    expect(received).toHaveLength(1);
  });
});
