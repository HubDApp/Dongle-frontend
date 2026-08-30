import {
  isKnownNotificationType,
  type NotificationStreamEvent,
} from "@/types/notification";

export function parseNotificationEvent(raw: unknown): NotificationStreamEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id) return null;
  if (typeof record.recipientId !== "string" || !record.recipientId) return null;
  if (typeof record.type !== "string") return null;
  if (typeof record.createdAt !== "string" || !record.createdAt) return null;
  if (!isKnownNotificationType(record.type)) return null;
  return {
    id: record.id,
    type: record.type,
    recipientId: record.recipientId,
    createdAt: record.createdAt,
    projectId: typeof record.projectId === "string" ? record.projectId : undefined,
    projectName: typeof record.projectName === "string" ? record.projectName : undefined,
    reviewId: typeof record.reviewId === "string" ? record.reviewId : undefined,
    messageKey: typeof record.messageKey === "string" ? record.messageKey : undefined,
    messageParams:
      record.messageParams && typeof record.messageParams === "object"
        ? (record.messageParams as Record<string, string>)
        : undefined,
  };
}
