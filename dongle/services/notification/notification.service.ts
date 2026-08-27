/**
 * Notification Service
 *
 * Persists lightweight in-app notifications for wallet users.
 * Currently used exclusively by the project-claim flow:
 *   - claimant receives a confirmation when they submit a claim
 *   - claimant receives an outcome notification when an admin approves/rejects
 *
 * All data is stored in localStorage under a single key, keyed by recipient
 * wallet address so that reads are always scoped to the connected wallet.
 */

import { generateId } from "@/lib/id-generator";
import {
  AppNotification,
  CreateNotificationParams,
} from "@/types/notification";

export const NOTIFICATION_STORAGE_KEY = "dongle_notifications";

// ── Private helpers ──────────────────────────────────────────────────────────

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
    if (typeof r.type !== "string") continue;
    if (typeof r.title !== "string") continue;
    if (typeof r.createdAt !== "string" || !r.createdAt) continue;
    if (typeof r.claimRequestId !== "string") continue;
    if (typeof r.projectId !== "string") continue;
    if (typeof r.projectName !== "string") continue;

    valid.push({
      id: r.id,
      recipientAddress: r.recipientAddress,
      type: r.type as AppNotification["type"],
      title: r.title,
      message: typeof r.message === "string" ? r.message : undefined,
      createdAt: r.createdAt,
      read: r.read === true,
      claimRequestId: r.claimRequestId,
      projectId: r.projectId,
      projectName: r.projectName,
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

// ── Public service ───────────────────────────────────────────────────────────

export const notificationService = {
  /**
   * Create and persist a new notification.
   * Returns the created notification.
   */
  create(params: CreateNotificationParams): AppNotification {
    const notification: AppNotification = {
      id: generateId(),
      recipientAddress: params.recipientAddress,
      type: params.type,
      title: params.title,
      message: params.message?.trim() || undefined,
      createdAt: new Date().toISOString(),
      read: false,
      claimRequestId: params.claimRequestId,
      projectId: params.projectId,
      projectName: params.projectName,
    };

    const all = loadAll();
    saveAll([notification, ...all]);
    return notification;
  },

  /**
   * Return all notifications for a given wallet address, newest first.
   */
  getForUser(recipientAddress: string): AppNotification[] {
    return loadAll()
      .filter((n) => n.recipientAddress === recipientAddress)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  },

  /**
   * Return unread notifications for a given wallet address.
   */
  getUnreadForUser(recipientAddress: string): AppNotification[] {
    return this.getForUser(recipientAddress).filter((n) => !n.read);
  },

  /**
   * Mark a single notification as read. No-ops gracefully if not found.
   */
  markRead(notificationId: string): void {
    const all = loadAll();
    const idx = all.findIndex((n) => n.id === notificationId);
    if (idx === -1) return;
    all[idx] = { ...all[idx], read: true };
    saveAll(all);
  },

  /**
   * Mark all notifications for a given user as read.
   */
  markAllReadForUser(recipientAddress: string): void {
    const all = loadAll().map((n) =>
      n.recipientAddress === recipientAddress ? { ...n, read: true } : n,
    );
    saveAll(all);
  },

  /**
   * Return the count of unread notifications for a given wallet address.
   */
  unreadCount(recipientAddress: string): number {
    return this.getUnreadForUser(recipientAddress).length;
  },

  // ── Test helpers ───────────────────────────────────────────────────────────

  /** Wipe all notifications from storage. Only intended for test environments. */
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
