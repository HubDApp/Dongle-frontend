import { describe, expect, it } from "vitest";
import type { AppNotification } from "@/types/notification";
import {
  DEFAULT_NOTIFICATION_FILTERS,
  filterNotifications,
  getNotificationCategory,
  getNotificationKind,
  getNotificationPriority,
  shouldToastNotification,
} from "@/lib/notifications/filters";

const notifications: AppNotification[] = [
  {
    id: "critical",
    recipientAddress: "user-1",
    type: "project_rejected",
    title: "Project rejected",
    createdAt: "2026-10-19T09:00:00.000Z",
    read: false,
  },
  {
    id: "review",
    recipientAddress: "user-1",
    type: "project_review_posted",
    title: "New review",
    createdAt: "2026-10-18T09:00:00.000Z",
    read: false,
  },
  {
    id: "update",
    recipientAddress: "user-1",
    type: "project_update_posted",
    title: "New update",
    createdAt: "2026-10-10T09:00:00.000Z",
    read: true,
  },
];

describe("notification filters", () => {
  it("classifies notifications by category, type, and priority", () => {
    expect(getNotificationCategory("project_rejected")).toBe("critical");
    expect(getNotificationKind("project_review_posted")).toBe("review");
    expect(getNotificationPriority("project_update_posted")).toBe("low");
  });

  it("filters by unread status, priority, and date preset while retaining critical notifications", () => {
    const filtered = filterNotifications(
      notifications,
      {
        ...DEFAULT_NOTIFICATION_FILTERS,
        unreadOnly: true,
        priority: "medium",
        datePreset: "today",
        categories: { critical: false, important: false, informational: true },
      },
      new Date("2026-10-19T12:00:00.000Z"),
    );

    expect(filtered.map((notification) => notification.id)).toEqual(["critical"]);
  });

  it("keeps informational events in history but does not toast them", () => {
    expect(shouldToastNotification("project_update_posted")).toBe(false);
    expect(shouldToastNotification("project_verified")).toBe(true);
  });
});
