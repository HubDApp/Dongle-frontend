"use client";

/**
 * ProjectTimeline — Issue #658
 *
 * Renders a chronological list of significant project events (newest first).
 * Supports pagination for projects with many events and an expandable detail
 * view per event.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Rocket,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/date";
import type { TimelineEvent, TimelineEventType } from "@/types/timeline";
import { TIMELINE_EVENT_LABELS } from "@/types/timeline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

// ─── Event visual config ──────────────────────────────────────────────────────

interface EventConfig {
  icon: React.ReactNode;
  dotColor: string;
  labelColor: string;
}

const EVENT_CONFIG: Record<TimelineEventType, EventConfig> = {
  created: {
    icon: <Rocket className="w-4 h-4" />,
    dotColor: "bg-blue-500",
    labelColor: "text-blue-600 dark:text-blue-400",
  },
  verified: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    dotColor: "bg-green-500",
    labelColor: "text-green-600 dark:text-green-400",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    dotColor: "bg-red-500",
    labelColor: "text-red-600 dark:text-red-400",
  },
  major_update: {
    icon: <Zap className="w-4 h-4" />,
    dotColor: "bg-amber-500",
    labelColor: "text-amber-600 dark:text-amber-400",
  },
  milestone_review: {
    icon: <Star className="w-4 h-4" />,
    dotColor: "bg-purple-500",
    labelColor: "text-purple-600 dark:text-purple-400",
  },
};

// ─── Single event row ─────────────────────────────────────────────────────────

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_CONFIG[event.type];

  return (
    <div className="relative flex gap-4">
      {/* Vertical line connector — hidden on the last row via CSS sibling selector */}
      <div className="flex flex-col items-center shrink-0 mt-1">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md shrink-0",
            config.dotColor,
          )}
          aria-hidden="true"
        >
          {config.icon}
        </div>
        {/* Line below dot */}
        <div className="w-0.5 grow bg-zinc-200 dark:bg-zinc-700 mt-1 group-last:hidden" />
      </div>

      {/* Content */}
      <div className="pb-6 min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <span
              className={cn("text-xs font-semibold uppercase tracking-wide", config.labelColor)}
            >
              {TIMELINE_EVENT_LABELS[event.type]}
            </span>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {event.title}
            </h4>
          </div>
          <time
            dateTime={event.occurredAt}
            className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap shrink-0"
          >
            {formatDate(event.occurredAt, "relative")}
          </time>
        </div>

        {event.description && (
          <div className="mt-1">
            {expanded ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {event.description}
              </p>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-1">
                {event.description}
              </p>
            )}
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-1 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse event details" : "Expand event details"}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> More
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ProjectTimelineProps {
  projectId: string;
  className?: string;
}

export function ProjectTimeline({ projectId, className }: ProjectTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchEvents = useCallback(
    async (targetPage: number, append = false) => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/timeline?page=${targetPage}&pageSize=20`,
        );
        if (!res.ok) throw new Error("Failed to load timeline");
        const json = await res.json();
        const data = json.data;
        setTotal(data.total);
        setHasMore(data.hasMore);
        setEvents((prev) => (append ? [...prev, ...data.events] : data.events));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load timeline");
      }
    },
    [projectId],
  );

  useEffect(() => {
    setIsLoading(true);
    fetchEvents(1).finally(() => setIsLoading(false));
  }, [fetchEvents]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    await fetchEvents(nextPage, true);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-10", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" aria-label="Loading timeline" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div
        role="alert"
        className={cn(
          "text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-2xl p-4",
          className,
        )}
      >
        {error}
      </div>
    );
  }

  // ── Empty state ──
  if (events.length === 0) {
    return (
      <div
        className={cn(
          "text-center py-10 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700",
          className,
        )}
      >
        <Rocket className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          No events yet
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          Events will appear here as the project evolves.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Project timeline" className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Timeline</h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {total} event{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Event list — "group" class enables the last-item line-hide trick */}
      <div className="relative">
        {events.map((event) => (
          <div key={event.id} className="group">
            <TimelineEventRow event={event} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadMore}
            isLoading={isLoadingMore}
          >
            {!isLoadingMore && "Load more events"}
          </Button>
        </div>
      )}
    </section>
  );
}
