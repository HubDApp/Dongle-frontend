"use client";

import { useMemo, useState } from "react";
import { Bell, BellOff, Download, Rss } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  CHANGELOG_CATEGORIES,
  CHANGELOG_CATEGORY_LABELS,
  changelogFileName,
  changelogToMarkdown,
  countByCategory,
  filterChangelog,
  formatChangelogDate,
  shortenAddress,
  type ChangelogCategory,
  type ChangelogEntry,
} from "@/lib/changelog";

const CATEGORY_STYLES: Record<ChangelogCategory, string> = {
  feature: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
  bugfix: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  security: "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/40 dark:text-green-300 dark:ring-green-900",
  announcement: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900",
};

export interface ChangelogViewProps {
  projectId: string;
  projectName: string;
  entries: ChangelogEntry[];
  /** Following a project delivers a notification for every new update. */
  isSubscribed: boolean;
  isSubscribing?: boolean;
  onToggleSubscribe: () => void;
}

/**
 * Version history for a project: newest first, filterable by category, with
 * semver badges, an RSS link, notification subscription and Markdown export.
 */
export default function ChangelogView({
  projectId,
  projectName,
  entries,
  isSubscribed,
  isSubscribing = false,
  onToggleSubscribe,
}: ChangelogViewProps) {
  const [selected, setSelected] = useState<Set<ChangelogCategory>>(new Set());
  const counts = useMemo(() => countByCategory(entries), [entries]);
  const visible = useMemo(() => filterChangelog(entries, selected), [entries, selected]);
  const rssHref = `/projects/${encodeURIComponent(projectId)}/changelog/rss`;

  const toggle = (category: ChangelogCategory) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const exportMarkdown = () => {
    const markdown = changelogToMarkdown(projectName, visible, {
      projectUrl: typeof window === "undefined" ? undefined : `${window.location.origin}/projects/${projectId}`,
    });
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = changelogFileName(projectName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="changelog-heading" className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={isSubscribed ? "secondary" : "primary"}
          size="sm"
          onClick={onToggleSubscribe}
          isLoading={isSubscribing}
          aria-pressed={isSubscribed}
          leftIcon={isSubscribed ? <BellOff className="h-4 w-4" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
        >
          {isSubscribed ? "Unsubscribe" : "Subscribe to updates"}
        </Button>
        <a
          href={rssHref}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Rss className="h-4 w-4" aria-hidden="true" />
          RSS feed
        </a>
        <Button
          variant="outline"
          size="sm"
          onClick={exportMarkdown}
          disabled={visible.length === 0}
          leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
        >
          Export Markdown
        </Button>
      </div>

      <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
        {CHANGELOG_CATEGORIES.map((category) => {
          const active = selected.has(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(category)}
              className={`rounded-full px-3 py-1 text-sm font-medium ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                active
                  ? CATEGORY_STYLES[category]
                  : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {CHANGELOG_CATEGORY_LABELS[category]} ({counts[category]})
            </button>
          );
        })}
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="px-2 py-1 text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Clear filters
          </button>
        )}
      </div>

      <h2 id="changelog-heading" className="sr-only">
        Changelog entries
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
        Showing {visible.length} of {entries.length} {entries.length === 1 ? "entry" : "entries"}, newest first
      </p>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-14 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {entries.length === 0
            ? "No changelog entries yet. Releases, fixes and announcements will appear here."
            : "No entries match these filters."}
        </div>
      ) : (
        <ol className="relative space-y-6 border-l border-zinc-200 pl-6 dark:border-zinc-800">
          {visible.map((entry) => (
            <li key={entry.id} id={`entry-${entry.id}`} className="relative scroll-mt-28">
              <span
                className="absolute -left-[31px] top-2 h-3 w-3 rounded-full border-2 border-white bg-zinc-400 dark:border-zinc-950"
                aria-hidden="true"
              />
              <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <time dateTime={entry.date} className="font-medium text-zinc-500 dark:text-zinc-400">
                    {formatChangelogDate(entry.date)}
                  </time>
                  {entry.version && (
                    <span
                      className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                      aria-label={`Version ${entry.version}`}
                    >
                      {entry.version}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${CATEGORY_STYLES[entry.category]}`}>
                    {CHANGELOG_CATEGORY_LABELS[entry.category]}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{entry.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {entry.description}
                </p>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Posted by{" "}
                  <span className="font-mono" title={entry.author}>
                    {shortenAddress(entry.author)}
                  </span>
                </p>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
