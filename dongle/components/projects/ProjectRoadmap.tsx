"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Circle, Clock3, X } from "lucide-react";
import { fetchProjectRoadmap } from "@/services/project/roadmap.service";
import { ROADMAP_STATUSES, type RoadmapMilestone, type RoadmapStatus } from "@/types/roadmap";

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  planned: "Planned",
  "in-progress": "In progress",
  completed: "Completed",
  delayed: "Delayed",
};

const STATUS_STYLES: Record<RoadmapStatus, string> = {
  planned: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  "in-progress": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  completed: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300",
  delayed: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300",
};

function formatTargetDate(value: string): string {
  if (!value) return "Date not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function ProjectRoadmap({ cid }: { cid?: string }) {
  const [statusFilter, setStatusFilter] = useState<"all" | RoadmapStatus>("all");
  const [selected, setSelected] = useState<RoadmapMilestone | null>(null);
  const [roadmapResult, setRoadmapResult] = useState<{
    cid: string;
    milestones: RoadmapMilestone[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!cid) return;

    let active = true;
    fetchProjectRoadmap(cid)
      .then((roadmap) => {
        if (active) {
          setRoadmapResult({ cid, milestones: roadmap.milestones, error: null });
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setRoadmapResult({
            cid,
            milestones: [],
            error: reason instanceof Error
              ? reason.message
              : "Could not load the project roadmap.",
          });
        }
      })

    return () => {
      active = false;
    };
  }, [cid]);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  const loading = Boolean(cid) && roadmapResult?.cid !== cid;
  const error = roadmapResult?.cid === cid ? roadmapResult.error : null;
  const milestones = useMemo(
    () => (roadmapResult?.cid === cid ? roadmapResult.milestones : []),
    [cid, roadmapResult],
  );

  const visibleMilestones = useMemo(
    () => statusFilter === "all"
      ? milestones
      : milestones.filter((milestone) => milestone.status === statusFilter),
    [milestones, statusFilter],
  );

  if (!cid) return null;

  return (
    <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900" aria-labelledby="project-roadmap-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="project-roadmap-title" className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Project roadmap
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Planned milestones and release progress
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          Filter
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | RoadmapStatus)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            aria-label="Filter roadmap by status"
          >
            <option value="all">All statuses</option>
            {ROADMAP_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-500" role="status">Loading roadmap…</p>
      ) : error ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" role="alert">
          {error}
        </p>
      ) : visibleMilestones.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          {milestones.length ? "No milestones match this status." : "No roadmap milestones have been published."}
        </p>
      ) : (
        <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[15px] before:top-6 before:w-px before:bg-zinc-200 dark:before:bg-zinc-700">
          {visibleMilestones.map((milestone, index) => (
            <li key={`${milestone.title}-${index}`} className="relative pl-11">
              <span className={`absolute left-0 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border ${STATUS_STYLES[milestone.status]}`} aria-hidden="true">
                {milestone.status === "completed" ? (
                  <Check className="h-4 w-4" />
                ) : milestone.status === "in-progress" ? (
                  <Clock3 className="h-4 w-4" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </span>
              <button
                type="button"
                onClick={() => setSelected(milestone)}
                className="w-full rounded-2xl border border-zinc-200 p-4 text-left transition-colors hover:border-blue-300 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:hover:border-blue-700 dark:hover:bg-zinc-800/60"
              >
                <span className="flex flex-wrap items-start justify-between gap-3">
                  <span>
                    <span className="block font-semibold text-zinc-900 dark:text-zinc-100">{milestone.title}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatTargetDate(milestone.targetDate)}
                    </span>
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[milestone.status]}`}>
                    {STATUS_LABELS[milestone.status]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="roadmap-milestone-title"
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="roadmap-milestone-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {selected.title}
                </h3>
                <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close milestone details"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {selected.description || "No additional details provided."}
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Target: {formatTargetDate(selected.targetDate)}
            </p>
          </section>
        </div>
      )}
    </section>
  );
}
