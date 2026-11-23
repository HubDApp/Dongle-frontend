"use client";

import React, { useState, useEffect } from "react";
import {
  getMergeHistory,
  restoreMerge,
  type MergeHistoryRecord,
} from "@/services/form-deduplication";
import { formatDate } from "@/lib/date";
import AddressDisplay from "@/components/ui/AddressDisplay";
import {
  RotateCcw,
  History,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface MergeHistoryViewerProps {
  currentUserAddress: string;
}

export default function MergeHistoryViewer({
  currentUserAddress,
}: MergeHistoryViewerProps) {
  const [history, setHistory] = useState<MergeHistoryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MergeHistoryRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadHistory = () => {
    setHistory(getMergeHistory());
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRestore = async (record: MergeHistoryRecord) => {
    const confirmed = window.confirm(
      `Are you sure you want to restore "${record.sourceProjectName}" and "${record.targetProjectName}"? This will rollback the target project to its pre-merge state.`,
    );
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const result = restoreMerge({
        mergeId: record.id,
        restoredBy: currentUserAddress || "admin_moderator",
        reason: "Admin requested rollback from Merge History Viewer",
      });

      if (result.success) {
        toast.success("Merge successfully restored!", {
          description: "Both submissions were restored to their exact pre-merge state.",
        });
        loadHistory();
        if (selectedRecord?.id === record.id) {
          setSelectedRecord(null);
        }
      } else {
        toast.error("Failed to restore merge", {
          description: result.error,
        });
      }
    } catch (err) {
      toast.error("An unexpected error occurred during restoration");
    } finally {
      setIsRestoring(false);
    }
  };

  if (history.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
          <History className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base mb-1">No Merge History</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          When duplicate submissions are identified and merged, full audit snapshots and rollback states will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" />
            Duplicate Submission Merge History
          </h3>
          <p className="text-xs text-zinc-500">
            {history.length} merge operation{history.length !== 1 ? "s" : ""} recorded with complete rollback snapshots.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {history.map((record) => {
          const isRestored = record.status === "restored";

          return (
            <div
              key={record.id}
              className={`p-5 rounded-2xl border transition-all ${
                isRestored
                  ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-70"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        isRestored
                          ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}
                    >
                      {record.status}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">{record.id}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    <span>{record.sourceProjectName}</span>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                    <span className="text-blue-600 dark:text-blue-400">
                      {record.targetProjectName}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-500 flex items-center gap-2 flex-wrap">
                    <span>Merged by:</span>
                    <AddressDisplay
                      address={record.mergedBy}
                      truncated={true}
                      inline={true}
                    />
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(record.timestamp, "short")}</span>
                    <span>•</span>
                    <span>{record.fieldDecisions.length} fields modified</span>
                  </div>

                  {isRestored && record.restoredAt && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-2">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restored by {record.restoredBy} on {formatDate(record.restoredAt, "short")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(record)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    View Details
                  </button>
                  {!isRestored && (
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={() => handleRestore(record)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore Merge
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Snapshot Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Merge Snapshot: {selectedRecord.id}
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="font-bold text-zinc-400 block mb-1">Source Record:</span>
                  <p className="font-bold text-sm">{selectedRecord.sourceProjectName}</p>
                  <p className="font-mono text-zinc-500">{selectedRecord.sourceProjectId}</p>
                </div>
                <div>
                  <span className="font-bold text-zinc-400 block mb-1">Target Record:</span>
                  <p className="font-bold text-sm text-blue-600 dark:text-blue-400">
                    {selectedRecord.targetProjectName}
                  </p>
                  <p className="font-mono text-zinc-500">{selectedRecord.targetProjectId}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Field Resolutions ({selectedRecord.fieldDecisions.length})
                </h4>
                <div className="space-y-2">
                  {selectedRecord.fieldDecisions.map((dec) => (
                    <div
                      key={dec.field}
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <span className="font-bold capitalize">{dec.field}</span>
                      <div className="text-right">
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {Array.isArray(dec.resolvedValue)
                            ? `[${dec.resolvedValue.join(", ")}]`
                            : String(dec.resolvedValue || "(empty)")}
                        </span>
                        <span className="block text-[10px] text-zinc-400 uppercase">
                          Strategy: {dec.strategy}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
