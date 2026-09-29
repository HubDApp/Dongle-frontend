/**
 * Notification Service
 *
 * Client-side history cache (localStorage) merged with SSE events.
 * Toast auto-dismiss must not delete rows from this history.
 */

import { generateId } from "@/lib/id-generator";
import {
  AppNotification,
  CreateNotificationParams,
  NOTIFICATION_HISTORY_LIMIT,
  isKnownNotificationType,
} from "@/types/notification";

export const NOTIFICATION_STORAGE_KEY = "dongle_notifications";

function loadAll(): AppNotification[] {
  if (typeof window === "undefined") return [];

  let raw: string | null;
  try {
    raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const valid: AppNotification[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    if (typeof r.id !== "string" || !r.id) continue;
    if (typeof r.recipientAddress !== "string" || !r.recipientAddress) continue;
    if (!isKnownNotificationType(r.type)) continue;
    if (typeof r.title !== "string") continue;
    if (typeof r.createdAt !== "string" || !r.createdAt) continue;

    valid.push({
      id: r.id,
      recipientAddress: r.recipientAddress,
      type: r.type,
      title: r.title,
      message: typeof r.message === "string" ? r.message : undefined,
      createdAt: r.createdAt,
      read: r.read === true,
      claimRequestId: typeof r.claimRequestId === "string" ? r.claimRequestId : undefined,
      projectId: typeof r.projectId === "string" ? r.projectId : undefined,
      projectName: typeof r.projectName === "string" ? r.projectName : undefined,
      reviewId: typeof r.reviewId === "string" ? r.reviewId : undefined,
      eventId: typeof r.eventId === "string" ? r.eventId : undefined,
    });
  }

  return valid;
}

function saveAll(notifications: AppNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage quota exceeded — fail silently
  }
}

function cap(items: AppNotification[]): AppNotification[] {
  return [...items]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, NOTIFICATION_HISTORY_LIMIT);
}

export const notificationService = {
  create(params: CreateNotificationParams): AppNotification {
    const notification: AppNotification = {
      id: params.id ?? generateId(),
      eventId: params.eventId ?? params.id,
      recipientAddress: params.recipientAddress,
      type: params.type,
      title: params.title,
      message: params.message?.trim() || undefined,
      createdAt: params.createdAt ?? new Date().toISOString(),
      read: false,
      claimRequestId: params.claimRequestId,
      projectId: params.projectId,
      projectName: params.projectName,
      reviewId: params.reviewId,
    };

    const all = this.upsert(notification);
    return all.find((n) => n.id === notification.id) ?? notification;
  },

  upsert(notification: AppNotification): AppNotification[] {
    const all = loadAll();
    const eventKey = notification.eventId ?? notification.id;
    const duplicate = all.find(
      (n) =>
        n.id === notification.id ||
        (eventKey && (n.eventId === eventKey || n.id === eventKey)),
    );
    if (duplicate) {
      return cap(all);
    }
    const next = cap([notification, ...all]);
    saveAll(next);
    return next;
  },

  getForUser(recipientAddress: string): AppNotification[] {
    return cap(
      loadAll().filter((n) => n.recipientAddress === recipientAddress),
    );
  },

  getUnreadForUser(recipientAddress: string): AppNotification[] {
    return this.getForUser(recipientAddress).filter((n) => !n.read);
  },

  markRead(notificationId: string): void {
    const all = loadAll();
    const idx = all.findIndex((n) => n.id === notificationId);
    if (idx === -1) return;
    all[idx] = { ...all[idx], read: true };
    saveAll(all);
  },

  markAllReadForUser(recipientAddress: string): void {
    const all = loadAll().map((n) =>
      n.recipientAddress === recipientAddress ? { ...n, read: true } : n,
    );
    saveAll(all);
  },

  unreadCount(recipientAddress: string): number {
    return Math.max(0, this.getUnreadForUser(recipientAddress).length);
  },

  _clearForTesting(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  },
};
