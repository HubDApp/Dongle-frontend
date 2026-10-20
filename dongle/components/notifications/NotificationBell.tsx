"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Bell, Download, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/context/notification.context";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatSmartDate } from "@/lib/i18n/format";
import {
  DEFAULT_NOTIFICATION_FILTERS,
  filterNotifications,
  getNotificationCategory,
  getNotificationKind,
  getNotificationPriority,
  readNotificationFilters,
  writeNotificationFilters,
  type NotificationCategory,
  type NotificationFilterState,
} from "@/lib/notifications/filters";

export default function NotificationBell() {
  const { t } = useTranslation();
  const { items, unread, status, open, setOpen, markRead, markReadMany } = useNotifications();
  const [filters, setFilters] = useState<NotificationFilterState>(DEFAULT_NOTIFICATION_FILTERS);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setFilters(readNotificationFilters());
    setFiltersLoaded(true);
  }, []);

  useEffect(() => {
    if (!filtersLoaded) return;
    writeNotificationFilters(filters);
  }, [filters, filtersLoaded]);

  const filteredItems = useMemo(
    () => filterNotifications(items, filters),
    [items, filters],
  );
  const importantUnread = items.filter(
    (item) => !item.read && getNotificationCategory(item.type) === "important",
  ).length;

  const updateFilters = (updates: Partial<NotificationFilterState>) => {
    setFilters((current) => ({ ...current, ...updates }));
  };

  const toggleCategory = (category: NotificationCategory) => {
    if (category === "critical") return;
    setFilters((current) => ({
      ...current,
      categories: { ...current.categories, [category]: !current.categories[category] },
    }));
  };

  const exportFiltered = () => {
    const blob = new Blob([JSON.stringify(filteredItems, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dongle-filtered-notifications.json";
    link.click();
    URL.revokeObjectURL(url);
  };

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
          className="absolute end-0 z-50 mt-2 flex max-h-[min(48rem,88vh)] w-[min(27rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        >
          <header className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{t("notifications.title")}</h2>
              {statusLabel ? (
                <p className="truncate text-[11px] text-zinc-500">{statusLabel}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200" aria-label={`${importantUnread} unread important notifications`}>
                {t("notifications.important")} {importantUnread}
              </span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => markReadMany(filteredItems.filter((item) => !item.read).map((item) => item.id))}
                disabled={!filteredItems.some((item) => !item.read)}
              >
                {t("notifications.markFilteredRead")}
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
          <div className="space-y-3 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={filters.unreadOnly}
                onClick={() => updateFilters({ unreadOnly: !filters.unreadOnly, readStatus: "all" })}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${filters.unreadOnly ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}
              >
                {t("notifications.unreadOnly")}
              </button>
              {(["today", "week"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  aria-pressed={filters.datePreset === range}
                  onClick={() => updateFilters({ datePreset: filters.datePreset === range ? "all" : range })}
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${filters.datePreset === range ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}
                >
                  {range === "today" ? t("notifications.today") : t("notifications.thisWeek")}
                </button>
              ))}
              <button
                type="button"
                title={t("notifications.exportFiltered")}
                aria-label={t("notifications.exportFiltered")}
                onClick={exportFiltered}
                disabled={filteredItems.length === 0}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-300 disabled:opacity-40 dark:border-zinc-700"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("notifications.filters")}
                <span className="ml-auto text-zinc-400">{t("notifications.shownCount", { count: filteredItems.length })}</span>
              </summary>
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-medium text-zinc-500">
                    {t("notifications.filterType")}
                    <select
                      aria-label="Filter notification type"
                      value={filters.kind}
                      onChange={(event) => updateFilters({ kind: event.target.value as NotificationFilterState["kind"] })}
                      className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="all">{t("notifications.allTypes")}</option>
                      <option value="verification">{t("notifications.verification")}</option>
                      <option value="review">{t("notifications.review")}</option>
                      <option value="update">{t("notifications.update")}</option>
                      <option value="system">{t("notifications.system")}</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-medium text-zinc-500">
                    {t("notifications.priority")}
                    <select
                      aria-label="Filter notification priority"
                      value={filters.priority}
                      onChange={(event) => updateFilters({ priority: event.target.value as NotificationFilterState["priority"] })}
                      className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="all">{t("notifications.allPriorities")}</option>
                      <option value="high">{t("notifications.high")}</option>
                      <option value="medium">{t("notifications.medium")}</option>
                      <option value="low">{t("notifications.low")}</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-medium text-zinc-500">
                    {t("notifications.readStatus")}
                    <select
                      aria-label="Filter notification read status"
                      value={filters.readStatus}
                      onChange={(event) => updateFilters({ readStatus: event.target.value as NotificationFilterState["readStatus"], unreadOnly: false })}
                      className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="all">{t("notifications.all")}</option>
                      <option value="unread">{t("notifications.unreadStatus")}</option>
                      <option value="read">{t("notifications.readStatusValue")}</option>
                    </select>
                  </label>
                  <fieldset className="text-[11px] font-medium text-zinc-500">
                    <legend>{t("notifications.categories")}</legend>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {(["critical", "important", "informational"] as const).map((category) => (
                        <label key={category} className="inline-flex items-center gap-1 capitalize">
                          <input
                            type="checkbox"
                            checked={category === "critical" || filters.categories[category]}
                            disabled={category === "critical"}
                            onChange={() => toggleCategory(category)}
                          />
                          {t(`notifications.${category}` as never)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-medium text-zinc-500">
                    {t("notifications.from")}
                    <input
                      aria-label="Notifications from date"
                      type="date"
                      value={filters.startDate}
                      onChange={(event) => updateFilters({ startDate: event.target.value })}
                      className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="text-[11px] font-medium text-zinc-500">
                    {t("notifications.to")}
                    <input
                      aria-label="Notifications to date"
                      type="date"
                      value={filters.endDate}
                      onChange={(event) => updateFilters({ endDate: event.target.value })}
                      className="mt-1 block w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                </div>
              </div>
            </details>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                {items.length === 0 ? t("notifications.empty") : t("notifications.noMatches")}
              </li>
            ) : (
              filteredItems.map((item) => (
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
                    <p className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.title}
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {t(`notifications.${getNotificationPriority(item.type)}` as never)}
                      </span>
                      <span className="sr-only">{getNotificationKind(item.type)} category</span>
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
                      href={item.type === "project_update" && item.updateId
                        ? `/projects/${item.projectId}/updates#${item.updateId}`
                        : `/projects/${item.projectId}`}
                      className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      {item.type === "project_update" ? t("notifications.viewUpdate") : t("notifications.viewProject")}
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
