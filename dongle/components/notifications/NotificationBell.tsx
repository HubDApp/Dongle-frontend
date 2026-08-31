"use client";

import { useEffect, useId, useRef } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/context/notification.context";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatSmartDate } from "@/lib/i18n/format";

export default function NotificationBell() {
  const { t } = useTranslation();
  const { items, unread, status, open, setOpen, markRead, markAllRead } = useNotifications();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, setOpen]);

  const statusLabel =
    status === "live"
      ? t("notifications.live")
      : status === "reconnecting"
        ? t("notifications.reconnecting")
        : status === "connecting"
          ? t("notifications.connecting")
          : status === "offline"
            ? t("notifications.offline")
            : "";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        aria-label={t("notifications.open")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -end-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
            <span className="sr-only">{t("notifications.unread", { count: unread })}</span>
          </span>
        ) : null}
      </button>
      {open ? (
        <section
          id={panelId}
          role="dialog"
          aria-label={t("notifications.title")}
          className="absolute end-0 z-50 mt-2 flex max-h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        >
          <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{t("notifications.title")}</h2>
              {statusLabel ? (
                <p className="truncate text-[11px] text-zinc-500">{statusLabel}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={markAllRead}
              >
                {t("notifications.markAllRead")}
              </button>
              <button
                ref={closeBtnRef}
                type="button"
                className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
                aria-label={t("notifications.close")}
              >
                {t("common.close")}
              </button>
            </div>
          </header>
          <ul className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                {t("notifications.empty")}
              </li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className={`border-b border-zinc-100 px-3 py-3 last:border-0 dark:border-zinc-800 ${
                    item.read ? "opacity-70" : "bg-blue-50/60 dark:bg-blue-950/20"
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-start"
                    onClick={() => markRead(item.id)}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t(`notifications.types.${item.type}` as never)}
                    </p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </p>
                    {item.message ? (
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {item.message}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {formatSmartDate(item.createdAt)}
                    </p>
                  </button>
                  {item.projectId ? (
                    <Link
                      href={`/projects/${item.projectId}`}
                      className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      {t("notifications.viewProject")}
                    </Link>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
