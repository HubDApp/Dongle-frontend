import {
  isKnownNotificationType,
  type NotificationStreamEvent,
} from "@/types/notification";

export async function emitNotificationEvent(
  event: Omit<NotificationStreamEvent, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isKnownNotificationType(event.type)) return;

  try {
    await fetch("/api/notifications/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...event,
        id: event.id ?? crypto.randomUUID(),
        createdAt: event.createdAt ?? new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("[notifications] failed to emit event", error);
  }
}
