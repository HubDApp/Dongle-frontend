import { describe, expect, it } from "vitest";
import { notificationPreferencesService } from "@/services/notifications/notification-preferences.service";
import {
  getDeliveryMode,
  getNextDigestAt,
  groupSimilarNotifications,
  isWithinQuietHours,
} from "@/lib/notifications/delivery-policy";

describe("notification delivery policy", () => {
  it("provides timezone-aware defaults and keeps device settings independent", () => {
    const userId = `preferences-${Date.now()}`;
    const defaults = notificationPreferencesService.getPreferences(userId);
    expect(defaults.quietHours.timeZone).toBeTruthy();
    expect(defaults.devices.desktop.enabled).toBe(true);
    expect(defaults.devices.mobile.enabled).toBe(true);

    const updated = notificationPreferencesService.updatePreferences(userId, {
      devices: {
        desktop: { ...defaults.devices.desktop, batchLowPriority: false },
        mobile: { ...defaults.devices.mobile, batchLowPriority: true },
      },
    });
    expect(updated.devices.desktop.batchLowPriority).toBe(false);
    expect(updated.devices.mobile.batchLowPriority).toBe(true);
  });

  it("evaluates overnight quiet hours in the configured timezone", () => {
    const quietHours = {
      enabled: true,
      startTime: "22:00",
      endTime: "08:00",
      timeZone: "America/New_York",
    };

    expect(isWithinQuietHours(new Date("2026-10-19T02:00:00.000Z"), quietHours)).toBe(true);
    expect(isWithinQuietHours(new Date("2026-10-19T13:00:00.000Z"), quietHours)).toBe(false);
  });

  it("lets urgent notifications bypass quiet hours and batching, unless DND is active", () => {
    const preferences = notificationPreferencesService.getPreferences(`policy-${Date.now()}`);
    preferences.quietHours = {
      enabled: true,
      startTime: "22:00",
      endTime: "08:00",
      timeZone: "America/New_York",
    };
    preferences.batching.enabled = true;
    const duringQuietHours = new Date("2026-10-19T02:00:00.000Z");

    expect(getDeliveryMode({ type: "submission_mention" }, preferences, "desktop", duringQuietHours)).toBe("immediate");
    expect(getDeliveryMode({ type: "project_update" }, preferences, "desktop", duringQuietHours)).toBe("defer");
    expect(getDeliveryMode({ type: "project_update" }, preferences, "desktop", new Date("2026-10-19T13:00:00.000Z"))).toBe("batch");
    preferences.doNotDisturb = true;
    expect(getDeliveryMode({ type: "submission_mention" }, preferences, "desktop", duringQuietHours)).toBe("silent");
  });

  it("calculates the next daily digest in the configured timezone", () => {
    const nextDigest = getNextDigestAt(
      new Date("2026-10-19T12:00:00.000Z"),
      { enabled: true, digestTime: "09:00", smartGrouping: true },
      "America/New_York",
    );
    expect(nextDigest.toISOString()).toBe("2026-10-19T13:00:00.000Z");
  });

  it("groups matching events when smart grouping is enabled", () => {
    const events = ["project_update", "project_update", "submission_comment"].map((type, index) => ({
      id: `event-${index}`,
      type,
      recipientId: "user-1",
      createdAt: "2026-10-19T12:00:00.000Z",
    }));

    expect(groupSimilarNotifications(events, true).map(({ type, count }) => ({ type, count }))).toEqual([
      { type: "project_update", count: 2 },
      { type: "submission_comment", count: 1 },
    ]);
    expect(groupSimilarNotifications(events, false)).toHaveLength(3);
  });
});