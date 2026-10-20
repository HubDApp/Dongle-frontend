"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircle,
  XCircle,
  FileSearch,
  UserPlus,
  AlertTriangle,
  Loader2,
} from "lucide-react";

/**
 * BatchVerificationActions — enables admins to process multiple
 * verifications in batch (#693).
 */

interface VerificationItem {
  id: string;
  projectName: string;
  status: string;
  submittedAt: string;
}

type BatchAction = "approve" | "reject" | "request_evidence" | "assign_auditor";

interface BatchVerificationActionsProps {
  verifications: VerificationItem[];
  onActionComplete?: () => void;
}

export function BatchVerificationActions({
  verifications,
  onActionComplete,
}: BatchVerificationActionsProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<BatchAction | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [progress, setProgress] = useState(0);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === verifications.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(verifications.map((v) => v.id)));
    }
  };

  const handleAction = (action: BatchAction) => {
    setPendingAction(action);
    setShowConfirm(true);
    if (action !== "reject") setRejectReason("");
  };

  const confirmAction = async () => {
    if (!pendingAction || selected.size === 0) return;

    setIsProcessing(true);
    setProgress(0);

    const ids = Array.from(selected);
    let completed = 0;

    for (const id of ids) {
      try {
        await fetch(`/api/verifications/${id}/batch-action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: pendingAction,
            reason: pendingAction === "reject" ? rejectReason : undefined,
          }),
        });
        completed++;
        setProgress(Math.round((completed / ids.length) * 100));
      } catch {
        // Continue with remaining items
      }
    }

    setIsProcessing(false);
    setShowConfirm(false);
    setSelected(new Set());
    toast.success(`${pendingAction} completed for ${completed} verification(s)`);
    onActionComplete?.();
  };

  const actionLabels: Record<BatchAction, string> = {
    approve: "Approve Selected",
    reject: "Reject Selected",
    request_evidence: "Request Evidence",
    assign_auditor: "Assign to Auditor",
  };

  return (
    <div className="space-y-4">
      {/* Selection controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.size === verifications.length && verifications.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="text-sm">Select all</span>
          </label>
          <span className="text-sm text-zinc-500">
            {selected.size} of {verifications.length} selected
          </span>
        </div>

        {/* Bulk action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0}
            onClick={() => handleAction("approve")}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0}
            onClick={() => handleAction("reject")}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0}
            onClick={() => handleAction("request_evidence")}
          >
            <FileSearch className="h-4 w-4 mr-1" />
            Request Evidence
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0}
            onClick={() => handleAction("assign_auditor")}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Assign Auditor
          </Button>
        </div>
      </div>

      {/* Verification list */}
      <div className="space-y-2">
        {verifications.map((v) => (
          <div
            key={v.id}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
              selected.has(v.id)
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(v.id)}
              onChange={() => toggleSelect(v.id)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <div className="flex-1">
              <p className="font-medium">{v.projectName}</p>
              <p className="text-xs text-zinc-500">
                Submitted {new Date(v.submittedAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={v.status === "pending" ? "warning" : "info"}>{v.status}</Badge>
          </div>
        ))}
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold">
                {pendingAction && actionLabels[pendingAction]}
              </h3>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to {pendingAction?.replace("_", " ")} {selected.size}{" "}
              verification(s)?
            </p>

            {pendingAction === "reject" && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  rows={3}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
            )}

            {/* Progress bar */}
            {isProcessing && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={confirmAction} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
