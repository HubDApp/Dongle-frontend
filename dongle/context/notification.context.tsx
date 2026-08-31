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
import { createNotificationStream, type StreamStatus } from "@/lib/notifications/stream";
import { parseNotificationEvent } from "@/lib/notifications/parse-event";
import {
  NOTIFICATION_HISTORY_LIMIT,
  NOTIFICATION_TOAST_MS,
  isKnownNotificationType,
  type AppNotification,
  type NotificationStreamEvent,
} from "@/types/notification";

interface NotificationContextValue {
  items: AppNotification[];
  unread: number;
  status: StreamStatus;
  open: boolean;
  setOpen: (open: boolean) => void;
  markRead: (id: string) => void;
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
  const streamRef = useRef<{ close: () => void } | null>(null);
  const seenToasts = useRef(new Set<string>());

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
            title: copy.title,
            message: copy.message,
            createdAt: event.createdAt,
            read: false,
            projectId: event.projectId,
            projectName: event.projectName,
            reviewId: event.reviewId,
          };
          notificationService.upsert(notification);
          loadLocal();
          if (!seenToasts.current.has(event.id)) {
            seenToasts.current.add(event.id);
            toast(copy.title, {
              description: copy.message,
              duration: NOTIFICATION_TOAST_MS,
            });
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
  }, [loadLocal, recipient, t]);

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

  const unread = Math.max(0, items.filter((item) => !item.read).length);

  const value = useMemo(
    () => ({ items, unread, status, open, setOpen, markRead, markAllRead }),
    [items, unread, status, open, markRead, markAllRead],
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
  markAllRead: () => {},
};

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext) ?? NOTIFICATION_FALLBACK;
}
