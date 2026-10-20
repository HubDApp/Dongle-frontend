"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/useConfirm";
import {
  BATCH_ACTIONS,
  BATCH_ACTION_LABELS,
  runBatchOperation,
  type BatchAction,
  type BatchEntity,
  type BatchItemHandler,
  type BatchProgress,
} from "@/services/admin/batch-operations.service";

interface BatchItem {
  id: string;
  label: string;
  detail?: string;
}

interface BatchOperationsPanelProps {
  entity: BatchEntity;
  title: string;
  items: BatchItem[];
  handler: BatchItemHandler;
  auditAction?: "submission_moderated" | "report_resolved" | "report_dismissed" | "verification_approved" | "verification_rejected";
}

export default function BatchOperationsPanel({ entity, title, items, handler, auditAction }: BatchOperationsPanelProps) {
  const confirm = useConfirm();
  const actions = BATCH_ACTIONS[entity];
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [activeAction, setActiveAction] = useState<BatchAction>(actions[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const selectedIds = useMemo(() => [...selected], [selected]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  };

  const run = async () => {
    if (selectedIds.length === 0 || isRunning) return;
    const confirmed = await confirm({
      title: `${BATCH_ACTION_LABELS[activeAction]} ${selectedIds.length} ${entity}?`,
      description: `This will ${BATCH_ACTION_LABELS[activeAction].toLowerCase()} ${selectedIds.length} ${entity}. Partial failures roll back completed items.`,
      variant: activeAction === "delete" || activeAction === "ban" || activeAction === "remove" ? "danger" : "warning",
      confirmLabel: `${BATCH_ACTION_LABELS[activeAction]} all`,
    });
    if (!confirmed) return;

    setIsRunning(true);
    setProgress({ completed: 0, total: selectedIds.length, currentId: selectedIds[0] ?? null });
    try {
      const summary = await runBatchOperation({
        entity,
        action: activeAction,
        ids: selectedIds,
        actor: "admin",
        handler,
        auditAction,
        rollbackOnPartialFailure: true,
        onProgress: setProgress,
      });
      if (summary.failed.length === 0) {
        toast.success(`${BATCH_ACTION_LABELS[activeAction]}: ${summary.succeeded.length} succeeded`);
      } else if (summary.succeeded.length > 0) {
        toast.warning(
          `${summary.succeeded.length} succeeded, ${summary.failed.length} failed${summary.rolledBack.length > 0 ? ` (${summary.rolledBack.length} rolled back)` : ""}`,
        );
      } else {
        toast.error(`${BATCH_ACTION_LABELS[activeAction]} failed for all ${summary.failed.length} items`);
      }
      setSelected(new Set());
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  const percent = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <section aria-label={`${title} batch operations`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">
            Action
            <select
              value={activeAction}
              onChange={(e) => setActiveAction(e.target.value as BatchAction)}
              className="ml-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
            >
              {actions.map((action) => (
                <option key={action} value={action}>
                  {BATCH_ACTION_LABELS[action]}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={run}
            disabled={selectedIds.length === 0 || isRunning}
            className="px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {isRunning ? `Processing… ${percent}%` : `Apply to ${selectedIds.length || "selection"}`}
          </button>
        </div>
      </div>

      {isRunning && progress && (
        <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="mb-4">
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {progress.completed}/{progress.total} — {progress.currentId ?? "finishing…"}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-5 h-5 accent-zinc-950 dark:accent-white" />
          Select all ({selected.size} selected)
        </label>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2.5">
            <input
              type="checkbox"
              aria-label={`Select ${item.label}`}
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              className="w-5 h-5 accent-zinc-950 dark:accent-white"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              <p className="text-xs text-zinc-500 font-mono truncate">{item.id}{item.detail ? ` • ${item.detail}` : ""}</p>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-8 text-center text-sm text-zinc-500">No {entity} available.</li>}
      </ul>
    </section>
  );
}
