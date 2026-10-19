import type { NotificationStreamEvent, NotificationType } from "@/types/notification";
import type { NotificationPreferences } from "@/services/notifications/notification-preferences.service";

export type NotificationDevice = "desktop" | "mobile";
export type DeliveryMode = "silent" | "immediate" | "batch" | "defer";

const URGENT_TYPES = new Set<NotificationType>([
  "project_rejected",
  "verification_evidence_requested",
  "submission_mention",
]);

const LOW_PRIORITY_TYPES = new Set<NotificationType>([
  "project_update",
  "review_approved",
  "review_rejected",
  "submission_comment",
  "submission_shared",
  "submission_team_change",
]);

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isWithinQuietHours(
  date: Date,
  quietHours: NotificationPreferences["quietHours"],
): boolean {
  if (!quietHours.enabled) return false;
  const { hour, minute } = getZonedParts(date, quietHours.timeZone);
  const current = hour * 60 + minute;
  const start = timeToMinutes(quietHours.startTime);
  const end = timeToMinutes(quietHours.endTime);
  if (start === end) return true;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

function localTimeToDate(
  year: number,
  month: number,
  day: number,
  time: string,
  timeZone: string,
): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hours, minutes);
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const zoned = getZonedParts(new Date(candidate), timeZone);
    const represented = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute);
    const difference = desired - represented;
    if (difference === 0) break;
    candidate += difference;
  }
  return new Date(candidate);
}

function nextLocalTime(now: Date, time: string, timeZone: string): Date {
  const today = getZonedParts(now, timeZone);
  let candidate = localTimeToDate(today.year, today.month, today.day, time, timeZone);
  if (candidate.getTime() <= now.getTime()) {
    const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
    candidate = localTimeToDate(
      tomorrow.getUTCFullYear(),
      tomorrow.getUTCMonth() + 1,
      tomorrow.getUTCDate(),
      time,
      timeZone,
    );
  }
  return candidate;
}

export function getNextDigestAt(
  now: Date,
  batching: NotificationPreferences["batching"],
  timeZone: string,
): Date {
  return nextLocalTime(now, batching.digestTime, timeZone);
}

export function getNextQuietHoursEnd(
  now: Date,
  quietHours: NotificationPreferences["quietHours"],
): Date {
  return nextLocalTime(now, quietHours.endTime, quietHours.timeZone);
}

export function getNotificationPriority(event: Pick<NotificationStreamEvent, "type" | "priority">): "urgent" | "normal" | "low" {
  if (event.priority) return event.priority;
  if (URGENT_TYPES.has(event.type as NotificationType)) return "urgent";
  if (LOW_PRIORITY_TYPES.has(event.type as NotificationType)) return "low";
  return "normal";
}

export function getDeliveryMode(
  event: Pick<NotificationStreamEvent, "type" | "priority">,
  preferences: NotificationPreferences,
  device: NotificationDevice,
  now = new Date(),
): DeliveryMode {
  const devicePreferences = preferences.devices[device];
  if (!preferences.enabled || preferences.doNotDisturb || !devicePreferences.enabled) return "silent";
  if (getNotificationPriority(event) === "urgent") return "immediate";
  if (
    preferences.quietHours.enabled &&
    devicePreferences.quietHours &&
    isWithinQuietHours(now, preferences.quietHours)
  ) {
    return "defer";
  }
  if (
    getNotificationPriority(event) === "low" &&
    preferences.batching.enabled &&
    devicePreferences.batchLowPriority
  ) {
    return "batch";
  }
  return "immediate";
}

export interface DigestGroup {
  type: string;
  count: number;
  events: NotificationStreamEvent[];
}

export function groupSimilarNotifications(
  events: NotificationStreamEvent[],
  smartGrouping: boolean,
): DigestGroup[] {
  const groups = new Map<string, DigestGroup>();
  for (const event of events) {
    const key = smartGrouping ? event.type : event.id;
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      group.events.push(event);
    } else {
      groups.set(key, { type: event.type, count: 1, events: [event] });
    }
  }
  return [...groups.values()];
}