import type { AppNotification, NotificationType } from "@/types/notification";

export type NotificationKind = "verification" | "review" | "update" | "system";
export type NotificationPriority = "high" | "medium" | "low";
export type NotificationCategory = "critical" | "important" | "informational";

export interface NotificationFilterState {
  kind: "all" | NotificationKind;
  priority: "all" | NotificationPriority;
  readStatus: "all" | "read" | "unread";
  unreadOnly: boolean;
  datePreset: "all" | "today" | "week";
  startDate: string;
  endDate: string;
  categories: Record<NotificationCategory, boolean>;
}

export const NOTIFICATION_FILTER_STORAGE_KEY = "dongle_notification_filters";

export const DEFAULT_NOTIFICATION_FILTERS: NotificationFilterState = {
  kind: "all",
  priority: "all",
  readStatus: "all",
  unreadOnly: false,
  datePreset: "all",
  startDate: "",
  endDate: "",
  categories: { critical: true, important: true, informational: true },
};

const CRITICAL_TYPES = new Set<NotificationType>([
  "project_rejected",
  "review_rejected",
  "verification_evidence_requested",
]);
const IMPORTANT_TYPES = new Set<NotificationType>([
  "project_verified",
  "project_verification_changed",
  "review_approved",
  "project_review_posted",
]);

export function getNotificationKind(type: NotificationType): NotificationKind {
  if (type.includes("verification") || type === "project_verified" || type === "project_rejected") {
    return "verification";
  }
  if (type.includes("review")) return "review";
  if (type.includes("update")) return "update";
  return "system";
}

export function getNotificationCategory(type: NotificationType): NotificationCategory {
  if (CRITICAL_TYPES.has(type)) return "critical";
  if (IMPORTANT_TYPES.has(type)) return "important";
  return "informational";
}

export function getNotificationPriority(type: NotificationType): NotificationPriority {
  const category = getNotificationCategory(type);
  if (category === "critical") return "high";
  if (category === "important") return "medium";
  return "low";
}

export function readNotificationFilters(): NotificationFilterState {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_FILTERS;
  try {
    const value = JSON.parse(localStorage.getItem(NOTIFICATION_FILTER_STORAGE_KEY) ?? "null");
    if (!value || typeof value !== "object") return DEFAULT_NOTIFICATION_FILTERS;
    const candidate = value as Partial<NotificationFilterState>;
    return {
      ...DEFAULT_NOTIFICATION_FILTERS,
      ...candidate,
      categories: {
        ...DEFAULT_NOTIFICATION_FILTERS.categories,
        ...(candidate.categories ?? {}),
        critical: true,
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_FILTERS;
  }
}

export function writeNotificationFilters(filters: NotificationFilterState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      NOTIFICATION_FILTER_STORAGE_KEY,
      JSON.stringify({ ...filters, categories: { ...filters.categories, critical: true } }),
    );
  } catch {
    // Filters remain usable for the current session if storage is unavailable.
  }
}

export function filterNotifications(
  items: AppNotification[],
  filters: NotificationFilterState,
  now = new Date(),
): AppNotification[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const customStart = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
  const customEnd = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`) : null;

  return items.filter((item) => {
    const category = getNotificationCategory(item.type);
    const priority = getNotificationPriority(item.type);
    const kind = getNotificationKind(item.type);
    const createdAt = new Date(item.createdAt);
    if (category !== "critical" && !filters.categories[category]) return false;
    if (filters.kind !== "all" && filters.kind !== kind) return false;
    if (filters.priority !== "all" && filters.priority !== priority) return false;
    if (filters.readStatus === "read" && !item.read) return false;
    if ((filters.readStatus === "unread" || filters.unreadOnly) && item.read) return false;
    if (filters.datePreset === "today" && createdAt < startOfToday) return false;
    if (filters.datePreset === "week" && createdAt < startOfWeek) return false;
    if (customStart && createdAt < customStart) return false;
    if (customEnd && createdAt > customEnd) return false;
    return true;
  });
}

export function shouldToastNotification(type: NotificationType): boolean {
  return getNotificationCategory(type) !== "informational";
}