"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useWallet } from "@/context/wallet.context";
import { useAuth } from "@/context/auth.context";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { notificationService } from "@/services/notification/notification.service";
import { notificationPreferencesService, type NotificationPreferences } from "@/services/notifications/notification-preferences.service";
import { createNotificationStream, type StreamStatus } from "@/lib/notifications/stream";
import { parseNotificationEvent } from "@/lib/notifications/parse-event";
import {
  getDeliveryMode,
  getNextDigestAt,
  getNextQuietHoursEnd,
  groupSimilarNotifications,
  type NotificationDevice,
} from "@/lib/notifications/delivery-policy";
import {
  loadPendingDeliveries,
  savePendingDeliveries,
  type PendingNotificationDelivery,
} from "@/lib/notifications/pending-delivery";
import {
  NOTIFICATION_HISTORY_LIMIT,
  NOTIFICATION_TOAST_MS,
  isKnownNotificationType,
  type AppNotification,
  type NotificationType,
  type NotificationStreamEvent,
} from "@/types/notification";
import { shouldToastNotification } from "@/lib/notifications/filters";

interface NotificationContextValue {
  items: AppNotification[];
  unread: number;
  status: StreamStatus;
  open: boolean;
  setOpen: (open: boolean) => void;
  markRead: (id: string) => void;
  markReadMany: (ids: string[]) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

function recipientId(userId: string | null, publicKey: string | null): string | null {
  return userId ?? publicKey;
}

function translateEvent(
  event: NotificationStreamEvent,
  t: (key: never, params?: Record<string, string | number>) => string,
): { title: string; message: string } {
  const type = isKnownNotificationType(event.type) ? event.type : "unknown";
  const titleKey = `notifications.types.${type}` as const;
  const messageKey = `notifications.messages.${type}` as const;
  const params = {
    projectName: event.projectName ?? event.projectId ?? "",
    updateTitle: event.updateTitle ?? "",
    ...(event.messageParams ?? {}),
  };
  return {
    title: t(titleKey as never, params),
    message: t(messageKey as never, params),
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { publicKey } = useWallet();
  const { user } = useAuth();
  const recipient = recipientId(user?.id ?? null, publicKey);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [open, setOpen] = useState(false);
  const [deliveryPreferences, setDeliveryPreferences] = useState<NotificationPreferences | null>(null);
  const [deliveryDevice, setDeliveryDevice] = useState<NotificationDevice>("desktop");
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingNotificationDelivery[]>([]);
  const [pendingReady, setPendingReady] = useState(false);
  const streamRef = useRef<{ close: () => void } | null>(null);
  const seenToasts = useRef(new Set<string>());

  useEffect(() => {
    if (!recipient) {
      setDeliveryPreferences(null);
      setPendingDeliveries([]);
      setPendingReady(true);
      return;
    }
    setPendingReady(false);
    setDeliveryPreferences(notificationPreferencesService.getPreferences(recipient));
    setPendingDeliveries(loadPendingDeliveries(recipient));
    setPendingReady(true);
  }, [recipient]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const updateDevice = () => setDeliveryDevice(media.matches ? "mobile" : "desktop");
    updateDevice();
    media.addEventListener("change", updateDevice);
    return () => media.removeEventListener("change", updateDevice);
  }, []);

  useEffect(() => {
    const onPreferencesChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; preferences: NotificationPreferences }>).detail;
      if (detail?.userId === recipient) setDeliveryPreferences(detail.preferences);
    };
    window.addEventListener("dongle:notification-preferences-changed", onPreferencesChanged);
    return () => window.removeEventListener("dongle:notification-preferences-changed", onPreferencesChanged);
  }, [recipient]);

  useEffect(() => {
    if (recipient && pendingReady) savePendingDeliveries(recipient, pendingDeliveries);
  }, [recipient, pendingDeliveries, pendingReady]);

  const showEventToast = useCallback((event: NotificationStreamEvent) => {
    const copy = translateEvent(event, t as never);
    toast(copy.title, { description: copy.message, duration: NOTIFICATION_TOAST_MS });
  }, [t]);

  useEffect(() => {
    if (!recipient || !deliveryPreferences || !pendingReady) return;
    if (!deliveryPreferences.enabled || deliveryPreferences.doNotDisturb) {
      const remaining: PendingNotificationDelivery[] = [];
      if (remaining.length !== pendingDeliveries.length) {
        setPendingDeliveries(remaining);
        savePendingDeliveries(recipient, remaining);
      }
      return;
    }

    if (!deliveryPreferences.devices[deliveryDevice].enabled) {
      const remaining = pendingDeliveries.filter((item) => item.device !== deliveryDevice);
      if (remaining.length !== pendingDeliveries.length) {
        setPendingDeliveries(remaining);
        savePendingDeliveries(recipient, remaining);
      }
      return;
    }

    const activePending = pendingDeliveries.filter((item) => item.device === deliveryDevice);
    if (activePending.length === 0) return;
    const dueAt = Math.min(...activePending.map((item) => Date.parse(item.dueAt)));
    const timer = window.setTimeout(() => {
      const now = new Date();
      const nextPending: PendingNotificationDelivery[] = [];
      const immediateEvents: NotificationStreamEvent[] = [];
      const batchedEvents: NotificationStreamEvent[] = [];
      for (const item of pendingDeliveries) {
        if (item.device !== deliveryDevice || Date.parse(item.dueAt) > now.getTime()) {
          nextPending.push(item);
          continue;
        }
        const mode = getDeliveryMode(item.event, deliveryPreferences, deliveryDevice, now);
        if (mode === "silent") continue;
        if (mode === "defer") {
          const quietEnd = getNextQuietHoursEnd(now, deliveryPreferences.quietHours);
          const keepAsBatch = item.kind === "batch" &&
            deliveryPreferences.batching.enabled &&
            deliveryPreferences.devices[deliveryDevice].batchLowPriority;
          nextPending.push({
            ...item,
            dueAt: keepAsBatch
              ? getNextDigestAt(quietEnd, deliveryPreferences.batching, deliveryPreferences.quietHours.timeZone).toISOString()
              : quietEnd.toISOString(),
            kind: keepAsBatch ? "batch" : "defer",
          });
        } else if (mode === "batch" && item.kind === "defer") {
          nextPending.push({
            ...item,
            dueAt: getNextDigestAt(now, deliveryPreferences.batching, deliveryPreferences.quietHours.timeZone).toISOString(),
            kind: "batch",
          });
        } else if (mode === "batch") {
          batchedEvents.push(item.event);
        } else {
          immediateEvents.push(item.event);
        }
      }

      immediateEvents.forEach(showEventToast);
      if (batchedEvents.length > 0) {
        const groups = groupSimilarNotifications(batchedEvents, deliveryPreferences.batching.smartGrouping);
        const description = groups.map((group) => {
          const copy = translateEvent(group.events[0], t as never);
          return `${group.count} ${copy.title}`;
        }).join(" · ");
        toast("Notification digest", { description, duration: NOTIFICATION_TOAST_MS });
      }
      setPendingDeliveries(nextPending);
      savePendingDeliveries(recipient, nextPending);
    }, Math.max(0, dueAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [
    recipient,
    deliveryPreferences,
    deliveryDevice,
    pendingDeliveries,
    pendingReady,
    showEventToast,
    t,
  ]);

  const loadLocal = useCallback(() => {
    if (!recipient) {
      setItems([]);
      return;
    }
    setItems(notificationService.getForUser(recipient).slice(0, NOTIFICATION_HISTORY_LIMIT));
  }, [recipient]);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  useEffect(() => {
    if (!recipient) {
      streamRef.current?.close();
      streamRef.current = null;
      setStatus("idle");
      void fetch("/api/notifications/identify", { method: "DELETE", credentials: "include" });
      return;
    }

    let cancelled = false;
    const start = async () => {
      try {
        await fetch("/api/notifications/identify", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: recipient }),
        });
        const historyRes = await fetch("/api/notifications", { credentials: "include" });
        if (historyRes.ok) {
          const body = (await historyRes.json()) as { items?: AppNotification[] };
          for (const item of body.items ?? []) {
            notificationService.upsert(item);
          }
          if (!cancelled) loadLocal();
        }
      } catch (error) {
        console.error("[notifications] identify failed", error);
      }
      if (cancelled) return;

      streamRef.current?.close();
      streamRef.current = createNotificationStream({
        url: "/api/notifications/stream",
        onStatus: setStatus,
        onError: (error) => {
          console.error("[notifications] stream error", error.message);
        },
        onEvent: (payload) => {
          const event = parseNotificationEvent(payload);
          if (!event) {
            console.warn(t("notifications.errors.malformed"));
            return;
          }
          const copy = translateEvent(event, t as never);
          const notification: AppNotification = {
            id: event.id,
            eventId: event.id,
            recipientAddress: recipient,
            type: event.type,
            priority: event.priority,
            title: copy.title,
            message: copy.message,
            createdAt: event.createdAt,
            read: false,
            projectId: event.projectId,
            projectName: event.projectName,
            updateId: event.updateId,
            reviewId: event.reviewId,
          };
          notificationService.upsert(notification);
          loadLocal();
          if (!seenToasts.current.has(event.id) && shouldToastNotification(event.type as NotificationType)) {
            seenToasts.current.add(event.id);
            const preferences = deliveryPreferences ?? notificationPreferencesService.getPreferences(recipient);
            const now = new Date();
            const mode = getDeliveryMode(event, preferences, deliveryDevice, now);
            if (mode === "immediate") {
              showEventToast(event);
            } else if (mode === "batch" || mode === "defer") {
              const dueAt = mode === "batch"
                ? getNextDigestAt(now, preferences.batching, preferences.quietHours.timeZone)
                : getNextQuietHoursEnd(now, preferences.quietHours);
              setPendingDeliveries((current) => current.some((item) => item.event.id === event.id)
                ? current
                : [...current, { event, dueAt: dueAt.toISOString(), device: deliveryDevice, kind: mode }]);
            }
          }
        },
      });
    };

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, [
    loadLocal,
    recipient,
    t,
    deliveryPreferences,
    deliveryDevice,
    showEventToast,
  ]);

  const markRead = useCallback(
    (id: string) => {
      notificationService.markRead(id);
      loadLocal();
      void fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    [loadLocal],
  );

  const markAllRead = useCallback(() => {
    if (!recipient) return;
    notificationService.markAllReadForUser(recipient);
    loadLocal();
    void fetch("/api/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  }, [loadLocal, recipient]);

  const markReadMany = useCallback(
    (ids: string[]) => {
      if (!recipient || ids.length === 0) return;
      notificationService.markReadMany(ids);
      loadLocal();
      void fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    },
    [loadLocal, recipient],
  );

  const unread = Math.max(0, items.filter((item) => !item.read).length);

  const value = useMemo(
    () => ({ items, unread, status, open, setOpen, markRead, markReadMany, markAllRead }),
    [items, unread, status, open, markRead, markReadMany, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

const NOTIFICATION_FALLBACK: NotificationContextValue = {
  items: [],
  unread: 0,
  status: "idle",
  open: false,
  setOpen: () => {},
  markRead: () => {},
  markReadMany: () => {},
  markAllRead: () => {},
};

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext) ?? NOTIFICATION_FALLBACK;
}
