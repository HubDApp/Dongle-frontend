"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import type { FormChangelogEntry, FormVersionRecord } from "@/services/form-builder";
import { formatSmartDate } from "@/lib/i18n/format";

interface FormVersionHistoryProps {
  versions: FormVersionRecord[];
  changelog: FormChangelogEntry[];
  activeVersion: number;
  onView?: (version: number) => void;
  onRevert?: (version: number) => void;
  viewingVersion?: number | null;
}

export function FormVersionHistory({
  versions,
  changelog,
  activeVersion,
  onView,
  onRevert,
  viewingVersion,
}: FormVersionHistoryProps) {
  const { t } = useTranslation();
  const changelogByVersion = new Map(changelog.map((c) => [c.version, c]));

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {t("forms.versioning.title")}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("forms.versioning.subtitle")}
        </p>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("forms.versioning.empty")}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {versions.map((record) => {
            const entry = changelogByVersion.get(record.version);
            const isActive = record.version === activeVersion;
            const isViewing = viewingVersion === record.version;
            return (
              <li
                key={record.version}
                className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between ${
                  isViewing ? "bg-blue-50/60 dark:bg-blue-950/30" : ""
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {t("forms.versioning.versionLabel", {
                        version: record.version,
                      })}
                    </span>
                    {isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {t("forms.versioning.active")}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {entry?.summary ?? t("forms.versioning.noSummary")}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t("forms.versioning.timestamp", {
                      date: formatSmartDate(new Date(record.createdAt)),
                    })}
                    {entry?.author
                      ? ` · ${t("forms.versioning.author", { author: entry.author })}`
                      : null}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {onView ? (
                    <button
                      type="button"
                      onClick={() => onView(record.version)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {t("forms.versioning.view")}
                    </button>
                  ) : null}
                  {onRevert && !isActive ? (
                    <button
                      type="button"
                      onClick={() => onRevert(record.version)}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
                    >
                      {t("forms.versioning.revert")}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
