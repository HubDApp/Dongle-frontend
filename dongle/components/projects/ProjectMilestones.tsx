"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/hooks/useConfirm";
import { useWatchlist } from "@/hooks/useWatchlist";
import { milestoneService } from "@/services/project/milestone.service";
import { MILESTONE_STATUSES, type MilestoneStatus, type ProjectMilestone, type ProjectMilestoneInput } from "@/types/milestone";
import { toast } from "sonner";

interface ProjectMilestonesProps {
  projectId: string;
  canManage: boolean;
  manageMode?: boolean;
}

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: "Planned",
  "in-progress": "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  planned: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isPastTargetDate(value: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return value.slice(0, 10) < today;
}

export default function ProjectMilestones({ projectId, canManage, manageMode = false }: ProjectMilestonesProps) {
  const confirm = useConfirm();
  const { triggerNotification } = useWatchlist();
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [editing, setEditing] = useState<ProjectMilestone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectMilestoneInput>({
    title: "",
    description: "",
    targetDate: new Date().toISOString().slice(0, 10),
    status: "planned",
  });

  const refresh = () => setMilestones(milestoneService.getByProject(projectId));

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener("dongle:project-milestones-changed", onChanged);
    return () => window.removeEventListener("dongle:project-milestones-changed", onChanged);
  }, [projectId]);

  const analytics = milestoneService.getAnalytics(projectId);

  const startCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      targetDate: new Date().toISOString().slice(0, 10),
      status: "planned",
    });
    setShowForm(true);
  };

  const startEdit = (milestone: ProjectMilestone) => {
    setEditing(milestone);
    setForm({
      title: milestone.title,
      description: milestone.description,
      targetDate: milestone.targetDate.slice(0, 10),
      status: milestone.status,
      progress: milestone.progress,
    });
    setShowForm(true);
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      const wasCompleted = editing?.status === "completed";
      const saved = editing
        ? milestoneService.update(editing.id, form)
        : milestoneService.create(projectId, form);
      if (saved?.status === "completed" && !wasCompleted) {
        triggerNotification(projectId, "project_update", `Milestone completed: ${saved.title}`);
      }
      refresh();
      setShowForm(false);
      setEditing(null);
      toast.success(editing ? "Milestone updated" : "Milestone added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save milestone");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (milestone: ProjectMilestone) => {
    const accepted = await confirm({
      title: "Delete milestone",
      description: `Delete “${milestone.title}”? This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!accepted) return;
    if (milestoneService.delete(milestone.id)) {
      refresh();
      toast.success("Milestone deleted");
    }
  };

  const showManagement = canManage && manageMode;

  return (
    <section className="space-y-5" aria-label="Project milestones">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold">Development milestones</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {analytics.completed} of {analytics.total} milestones completed ({analytics.completionRate}%).
          </p>
        </div>
        {showManagement ? (
          <Button variant="primary" onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />Add milestone
          </Button>
        ) : canManage ? (
          <Link
            href={`/projects/${projectId}/milestones`}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Manage milestones
          </Link>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Metric label="Completion" value={`${analytics.completionRate}%`} />
        <Metric label="On time" value={analytics.onTime} />
        <Metric label="Delayed" value={analytics.delayed} />
        <Metric label="Overdue" value={analytics.overdue} />
      </div>

      {showForm && showManagement && (
        <form onSubmit={save} className="space-y-4 border-y border-zinc-200 py-5 dark:border-zinc-800">
          <h3 className="font-semibold">{editing ? "Edit milestone" : "New milestone"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Title
              <Input className="mt-1" required maxLength={100} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className="text-sm font-medium">
              Target date
              <Input className="mt-1" type="date" required value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Description
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                maxLength={2000}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label className="text-sm font-medium">
              Status
              <select className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MilestoneStatus })}>
                {MILESTONE_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">
              Progress (optional)
              <Input className="mt-1" type="number" min={0} max={100} value={form.progress ?? ""} onChange={(event) => setForm({ ...form, progress: event.target.value === "" ? undefined : event.target.valueAsNumber })} />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save milestone"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {milestones.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No milestones have been published yet.
          {showManagement && <p className="mt-2">Add the first milestone to start the project roadmap.</p>}
        </div>
      ) : (
        <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {milestones.map((milestone) => {
            const progress = milestone.status === "completed" ? 100 : milestone.progress ?? 0;
            return (
              <li key={milestone.id} className="relative py-5 first:pt-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{milestone.title}</h3>
                      <Badge className={STATUS_COLORS[milestone.status]}>{STATUS_LABELS[milestone.status]}</Badge>
                    </div>
                    {milestone.description && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{milestone.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Target {formatDate(milestone.targetDate)}</span>
                      {milestone.completedDate && <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" />Completed {formatDate(milestone.completedDate)}</span>}
                      {milestone.status !== "completed" && isPastTargetDate(milestone.targetDate) && milestone.status !== "cancelled" && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />Delayed</span>}
                    </div>
                    {milestone.status !== "cancelled" && (
                      <div className="mt-3 max-w-lg">
                        <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Progress</span><span>{progress}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="progressbar" aria-label={`${milestone.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                          <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {showManagement && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => startEdit(milestone)} title="Edit milestone" aria-label={`Edit ${milestone.title}`} className="rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                      <button type="button" onClick={() => void remove(milestone)} title="Delete milestone" aria-label={`Delete ${milestone.title}`} className="rounded p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-l-2 border-blue-500 pl-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
