/**
 * Server-side in-memory notification bus.
 *
 * This process-local store is the integration boundary for live events in
 * this frontend repository. Production multi-instance deploys MUST replace
 * it with Redis (or another pub/sub) — see docs/FEATURES.md.
 *
 * Recipients only receive their own notifications. History is capped at 50.
 */

import {
  NOTIFICATION_HISTORY_LIMIT,
  isKnownNotificationType,
  type AppNotification,
  type NotificationStreamEvent,
  type NotificationType,
} from "@/types/notification";

type Listener = (event: NotificationStreamEvent) => void;

const history = new Map<string, AppNotification[]>();
const listeners = new Map<string, Set<Listener>>();
const seenEventIds = new Map<string, Set<string>>();

function recipientHistory(recipientId: string): AppNotification[] {
  return history.get(recipientId) ?? [];
}

function rememberEventId(recipientId: string, eventId: string): boolean {
  let set = seenEventIds.get(recipientId);
  if (!set) {
    set = new Set();
    seenEventIds.set(recipientId, set);
  }
  if (set.has(eventId)) return false;
  set.add(eventId);
  if (set.size > NOTIFICATION_HISTORY_LIMIT * 4) {
    const trimmed = [...set].slice(-NOTIFICATION_HISTORY_LIMIT * 2);
    seenEventIds.set(recipientId, new Set(trimmed));
  }
  return true;
}

export function publishNotificationEvent(
  input: NotificationStreamEvent,
): AppNotification | null {
  if (!input.id || !input.recipientId || !input.createdAt) {
    return null;
  }
  if (!isKnownNotificationType(input.type)) {
    return null;
  }
  if (!rememberEventId(input.recipientId, input.id)) {
    return null;
  }

  const notification: AppNotification = {
    id: input.id,
    eventId: input.id,
    recipientAddress: input.recipientId,
    type: input.type as NotificationType,
    title: input.type,
    message: undefined,
    createdAt: input.createdAt,
    read: false,
    projectId: input.projectId,
    projectName: input.projectName,
    reviewId: input.reviewId,
  };

  const next = [notification, ...recipientHistory(input.recipientId)].slice(
    0,
    NOTIFICATION_HISTORY_LIMIT,
  );
  history.set(input.recipientId, next);

  const subs = listeners.get(input.recipientId);
  if (subs) {
    for (const listener of subs) {
      try {
        listener(input);
      } catch (error) {
        console.error("[notifications] subscriber failed", error);
      }
    }
  }

  return notification;
}

export function listNotifications(recipientId: string): AppNotification[] {
  return recipientHistory(recipientId);
}

export function markNotificationRead(recipientId: string, notificationId: string): void {
  const items = recipientHistory(recipientId).map((item) =>
    item.id === notificationId ? { ...item, read: true } : item,
  );
  history.set(recipientId, items);
}

export function markAllNotificationsRead(recipientId: string): void {
  history.set(
    recipientId,
    recipientHistory(recipientId).map((item) => ({ ...item, read: true })),
  );
}

export function unreadCount(recipientId: string): number {
  return recipientHistory(recipientId).filter((item) => !item.read).length;
}

export function subscribeNotifications(recipientId: string, listener: Listener): () => void {
  let set = listeners.get(recipientId);
  if (!set) {
    set = new Set();
    listeners.set(recipientId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) {
      listeners.delete(recipientId);
    }
  };
}

export function subscriberCount(): number {
  let total = 0;
  for (const set of listeners.values()) total += set.size;
  return total;
}

/** Test helper — not for production request handlers. */
export function resetNotificationBusForTests(): void {
  history.clear();
  listeners.clear();
  seenEventIds.clear();
}
