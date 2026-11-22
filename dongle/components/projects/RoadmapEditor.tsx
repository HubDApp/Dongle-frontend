"use client";

import { Controller, useFormState, type Control, type FieldError } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import type { ProjectFormValues } from "@/components/projects/ProjectForm";
import { ROADMAP_STATUSES, type RoadmapMilestone } from "@/types/roadmap";

interface MilestoneFieldErrors {
  title?: FieldError;
  description?: FieldError;
}

const STATUS_LABELS: Record<(typeof ROADMAP_STATUSES)[number], string> = {
  planned: "Planned",
  "in-progress": "In progress",
  completed: "Completed",
  delayed: "Delayed",
};

const EMPTY_MILESTONE: RoadmapMilestone = {
  title: "",
  description: "",
  status: "planned",
  targetDate: "",
};

export default function RoadmapEditor({
  control,
}: {
  control: Control<ProjectFormValues>;
}) {
  // Issue #936: surface milestone validation errors and link them to their inputs.
  const { errors } = useFormState({ control });
  const roadmapErrors = errors.roadmap as unknown as
    | (MilestoneFieldErrors | undefined)[]
    | undefined;
  const roadmapRootError = (errors.roadmap as unknown as FieldError | undefined)?.message;

  return (
    <Controller
      name="roadmap"
      control={control}
      render={({ field }) => {
        const milestones = field.value ?? [];
        const updateMilestone = (index: number, update: Partial<RoadmapMilestone>) => {
          field.onChange(
            milestones.map((milestone, itemIndex) =>
              itemIndex === index ? { ...milestone, ...update } : milestone,
            ),
          );
        };

        return (
          <section className="space-y-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800" aria-labelledby="roadmap-editor-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="roadmap-editor-title" className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Project roadmap
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Milestones are published to IPFS and their CID is stored with the project on-chain.
                </p>
              </div>
              <button
                type="button"
                onClick={() => field.onChange([...milestones, { ...EMPTY_MILESTONE }])}
                disabled={milestones.length >= 30}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add milestone
              </button>
            </div>

            {milestones.length === 0 ? (
              <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                No roadmap milestones yet.
              </p>
            ) : (
              <div className="space-y-3">
                {milestones.map((milestone, index) => {
                  const titleError = roadmapErrors?.[index]?.title?.message;
                  const titleId = `roadmap-milestone-${index}-title`;
                  const titleErrorId = `${titleId}-error`;
                  return (
                  <fieldset key={index} className="grid gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900 md:grid-cols-2">
                    <legend className="sr-only">Milestone {index + 1}</legend>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Title
                        <input
                          id={titleId}
                          value={milestone.title}
                          onChange={(event) => updateMilestone(index, { title: event.target.value })}
                          maxLength={120}
                          required
                          aria-invalid={titleError ? true : undefined}
                          aria-describedby={titleError ? titleErrorId : undefined}
                          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </label>
                      {titleError && (
                        <p
                          id={titleErrorId}
                          role="alert"
                          className="mt-1 text-xs text-red-500 dark:text-red-400"
                        >
                          {titleError}
                        </p>
                      )}
                    </div>
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Status
                      <select
                        value={milestone.status}
                        onChange={(event) => updateMilestone(index, { status: event.target.value as RoadmapMilestone["status"] })}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        {ROADMAP_STATUSES.map((status) => (
                          <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Target date
                      <input
                        type="date"
                        value={milestone.targetDate}
                        onChange={(event) => updateMilestone(index, { targetDate: event.target.value })}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                    </label>
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 md:col-span-2">
                      Description
                      <textarea
                        value={milestone.description}
                        onChange={(event) => updateMilestone(index, { description: event.target.value })}
                        maxLength={2000}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                    </label>
                    <div className="md:col-span-2 md:flex md:justify-end">
                      <button
                        type="button"
                        onClick={() => field.onChange(milestones.filter((_, itemIndex) => itemIndex !== index))}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                        aria-label={`Remove milestone ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Remove milestone
                      </button>
                    </div>
                  </fieldset>
                  );
                })}
              </div>
            )}
            {roadmapRootError && (
              <p id="roadmap-error" role="alert" className="text-xs text-red-500 dark:text-red-400">
                {roadmapRootError}
              </p>
            )}
            {milestones.length >= 30 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                A roadmap can contain up to 30 milestones.
              </p>
            )}
          </section>
        );
      }}
    />
  );
}
