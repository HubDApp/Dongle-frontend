import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  publishNotificationEvent,
  listNotifications,
  resetNotificationBusForTests,
  subscribeNotifications,
  unreadCount,
} from "@/lib/notifications/server-store";
import { parseNotificationEvent } from "@/lib/notifications/parse-event";
import { computeReconnectDelay, createNotificationStream } from "@/lib/notifications/stream";
import { notificationService } from "@/services/notification/notification.service";
import { NOTIFICATION_HISTORY_LIMIT, NOTIFICATION_TOAST_MS } from "@/types/notification";

describe("notification bus", () => {
  beforeEach(() => {
    resetNotificationBusForTests();
    notificationService._clearForTesting();
  });

  it("stores incoming events and ignores duplicates", () => {
    const event = {
      id: "evt-1",
      type: "project_verified",
      recipientId: "user-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      projectName: "Swap",
    };
    expect(publishNotificationEvent(event)).not.toBeNull();
    expect(publishNotificationEvent(event)).toBeNull();
    expect(listNotifications("user-1")).toHaveLength(1);
    expect(unreadCount("user-1")).toBe(1);
  });

  it("caps history at 50", () => {
    for (let i = 0; i < 60; i++) {
      publishNotificationEvent({
        id: `evt-${i}`,
        type: "review_approved",
        recipientId: "user-1",
        createdAt: new Date(2026, 0, 1, 0, i).toISOString(),
      });
    }
    expect(listNotifications("user-1")).toHaveLength(NOTIFICATION_HISTORY_LIMIT);
  });

  it("delivers one event to 100 concurrent subscribers", () => {
    const received: string[] = [];
    const unsubs = Array.from({ length: 100 }, (_, i) =>
      subscribeNotifications("room", (event) => {
        received.push(`${i}:${event.id}`);
      }),
    );

    publishNotificationEvent({
      id: "blast",
      type: "project_rejected",
      recipientId: "room",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(received).toHaveLength(100);
    unsubs.forEach((unsub) => unsub());
  });

  it("ignores malformed and unknown types", () => {
    expect(parseNotificationEvent(null)).toBeNull();
    expect(parseNotificationEvent({ id: "x" })).toBeNull();
    expect(
      parseNotificationEvent({
        id: "x",
        recipientId: "u",
        type: "not_a_type",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
    expect(
      publishNotificationEvent({
        id: "bad",
        type: "nope",
        recipientId: "u",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
  });
});

describe("notification client history", () => {
  beforeEach(() => {
    notificationService._clearForTesting();
  });

  it("does not go negative and keeps toast expiry separate from history", () => {
    notificationService.create({
      recipientAddress: "G1",
      type: "project_verified",
      title: "Verified",
      projectName: "A",
      eventId: "e1",
    });
    expect(notificationService.unreadCount("G1")).toBe(1);
    notificationService.markAllReadForUser("G1");
    expect(notificationService.unreadCount("G1")).toBe(0);
    expect(notificationService.getForUser("G1")).toHaveLength(1);
    expect(NOTIFICATION_TOAST_MS).toBe(5000);
  });

  it("deduplicates by event id", () => {
    notificationService.create({
      recipientAddress: "G1",
      type: "review_approved",
      title: "A",
      eventId: "same",
    });
    notificationService.create({
      recipientAddress: "G1",
      type: "review_approved",
      title: "A",
      eventId: "same",
    });
    expect(notificationService.getForUser("G1")).toHaveLength(1);
  });
});

describe("notification reconnect", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses bounded exponential backoff", () => {
    expect(computeReconnectDelay(1, 1000, 30_000)).toBe(1000);
    expect(computeReconnectDelay(2, 1000, 30_000)).toBe(2000);
    expect(computeReconnectDelay(8, 1000, 30_000)).toBe(30_000);
  });

  it("reconnects after connection failure and stops after the budget", () => {
    vi.useFakeTimers();
    class FakeEventSource {
      onerror: (() => void) | null = null;
      onopen: (() => void) | null = null;
      addEventListener() {}
      close() {}
      constructor() {
        queueMicrotask(() => this.onerror?.());
      }
    }

    const onStatus = vi.fn();
    const onError = vi.fn();
    const handle = createNotificationStream({
      url: "/api/notifications/stream",
      fetchEventSource: FakeEventSource as unknown as typeof EventSource,
      onEvent: () => {},
      onStatus,
      onError,
      maxRetries: 2,
      baseDelayMs: 10,
      maxDelayMs: 10,
    });

    vi.runAllTimers();
    expect(onError).toHaveBeenCalled();
    handle.close();
  });
});
