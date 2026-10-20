import type { NotificationStreamEvent } from "@/types/notification";
import { parseNotificationEvent } from "@/lib/notifications/parse-event";
import type { NotificationDevice } from "@/lib/notifications/delivery-policy";

export interface PendingNotificationDelivery {
  event: NotificationStreamEvent;
  dueAt: string;
  device: NotificationDevice;
  kind: "batch" | "defer";
}

function storageKey(recipient: string): string {
  return `dongle_notification_pending_${recipient}`;
}

export function loadPendingDeliveries(recipient: string): PendingNotificationDelivery[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(storageKey(recipient));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      const event = parseNotificationEvent(item.event);
      if (!event || typeof item.dueAt !== "string" || !Number.isFinite(Date.parse(item.dueAt))) return [];
      return [{
        event,
        dueAt: item.dueAt,
        device: item.device === "mobile" ? "mobile" : "desktop",
        kind: item.kind === "batch" ? "batch" : "defer",
      }];
    });
  } catch {
    return [];
  }
}

export function savePendingDeliveries(
  recipient: string,
  pending: PendingNotificationDelivery[],
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(recipient), JSON.stringify(pending));
  } catch {
    // A full storage quota should not block live notification delivery.
  }
}