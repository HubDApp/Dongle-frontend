/**
 * Batch Operations Service (#699)
 *
 * Runs bulk actions on Projects, Reviews, and Users with checkbox selection,
 * per-item confirmation (handled by the UI via useConfirm), async processing
 * with progress callbacks, per-item audit log entries, and rollback on
 * partial failure.
 *
 * Rollback strategy: each handler may return an `undo` closure capturing the
 * pre-action snapshot. When any item fails and `rollbackOnPartialFailure` is
 * true, completed `undo` closures run in reverse order.
 */

import { auditLogService } from "@/services/audit/audit-log.service";

export type BatchEntity = "projects" | "reviews" | "users";

export type BatchAction =
  | "feature"
  | "hide"
  | "delete"
  | "approve"
  | "remove"
  | "flag"
  | "ban"
  | "promote"
  | "message";

export const BATCH_ACTIONS: Record<BatchEntity, BatchAction[]> = {
  projects: ["feature", "hide", "delete"],
  reviews: ["approve", "remove", "flag"],
  users: ["ban", "promote", "message"],
};

export const BATCH_ACTION_LABELS: Record<BatchAction, string> = {
  feature: "Feature",
  hide: "Hide",
  delete: "Delete",
  approve: "Approve",
  remove: "Remove",
  flag: "Flag",
  ban: "Ban",
  promote: "Promote",
  message: "Message",
};

export interface BatchItemResult {
  id: string;
  ok: boolean;
  error?: string;
  rolledBack?: boolean;
}

export interface BatchProgress {
  completed: number;
  total: number;
  currentId: string | null;
}

export interface BatchOperationSummary {
  action: BatchAction;
  entity: BatchEntity;
  succeeded: string[];
  failed: BatchItemResult[];
  rolledBack: string[];
}

export interface BatchHandlerContext {
  entity: BatchEntity;
  action: BatchAction;
  actor: string;
}

/** Per-item worker. Return `undo` to support rollback of completed items. */
export type BatchItemHandler = (
  id: string,
  ctx: BatchHandlerContext,
) => Promise<{ undo?: () => Promise<void> | void } | void>;

export interface RunBatchOptions {
  entity: BatchEntity;
  action: BatchAction;
  ids: string[];
  actor: string;
  handler: BatchItemHandler;
  onProgress?: (progress: BatchProgress) => void;
  rollbackOnPartialFailure?: boolean;
  auditAction?: Parameters<typeof auditLogService.append>[0]["action"];
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function runBatchOperation(options: RunBatchOptions): Promise<BatchOperationSummary> {
  const { entity, action, ids, actor, handler, onProgress, auditAction } = options;
  const rollbackOnPartialFailure = options.rollbackOnPartialFailure ?? true;

  const succeeded: string[] = [];
  const failed: BatchItemResult[] = [];
  const undos: Array<{ id: string; undo: () => Promise<void> | void }> = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    onProgress?.({ completed: i, total: ids.length, currentId: id });
    try {
      // Yield between items so progress UI paints during large batches.
      await delay(0);
      const result = await handler(id, { entity, action, actor });
      if (result?.undo) undos.push({ id, undo: result.undo });
      succeeded.push(id);
      if (auditAction) {
        auditLogService.append({
          actor,
          action: auditAction,
          targetId: id,
          targetLabel: `${entity} ${id}`,
          reason: `Batch ${action}`,
          metadata: { entity, action },
        });
      }
    } catch (error) {
      failed.push({ id, error: error instanceof Error ? error.message : "Batch item failed" });
    }
  }
  onProgress?.({ completed: ids.length, total: ids.length, currentId: null });

  let rolledBack: string[] = [];
  if (failed.length > 0 && rollbackOnPartialFailure && succeeded.length > 0) {
    for (const { id, undo } of [...undos].reverse()) {
      try {
        await undo();
        rolledBack.push(id);
      } catch {
        failed.push({ id, error: "Rollback failed" });
      }
    }
  }

  return { action, entity, succeeded, failed, rolledBack };
}
