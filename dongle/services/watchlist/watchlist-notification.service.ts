export type WatchlistNotificationType =
  | "added"
  | "removed"
  | "project_update"
  | "verification_change"
  | "major_review";

export interface WatchlistNotification {
  id: string;
  projectId: string;
  type: WatchlistNotificationType;
  message: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = "dongle_watchlist_notifications";
const NOTIFICATION_EVENT = "dongle:watchlist-notification";

function readNotifications(): WatchlistNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotifications(notifications: WatchlistNotification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
}

export function notifyWatchlistEvent(
  projectId: string,
  type: WatchlistNotificationType,
  customMessage?: string,
): WatchlistNotification {
  const messages: Record<WatchlistNotificationType, string> = {
    added: "Project added to your watchlist",
    removed: "Project removed from your watchlist",
    project_update: customMessage ?? "A watched project posted an update",
    verification_change: customMessage ?? "Verification status changed for a watched project",
    major_review: customMessage ?? "A watched project received a major review",
  };

  const notification: WatchlistNotification = {
    id: crypto.randomUUID(),
    projectId,
    type,
    message: customMessage ?? messages[type],
    createdAt: new Date().toISOString(),
    read: false,
  };

  const next = [notification, ...readNotifications()];
  writeNotifications(next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: notification }));
  }

  return notification;
}

export function getWatchlistNotifications(): WatchlistNotification[] {
  return readNotifications();
}

export function markNotificationRead(id: string): void {
  const next = readNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
  writeNotifications(next);
}

export function getUnreadNotificationCount(): number {
  return readNotifications().filter((n) => !n.read).length;
}
