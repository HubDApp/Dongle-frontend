"use client";

import React, { useState } from "react";
import {
  suggestMerge,
  executeMerge,
  type FieldMergeDecision,
} from "@/services/form-deduplication";
import type { Project } from "@/types/project";
import {
  GitMerge,
  X,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Layers,
  FileText,
  Globe,
  Tag,
  Code,
} from "lucide-react";
import { toast } from "sonner";

interface DuplicateMergeModalProps {
  targetProject: Project;
  sourceProject: Project;
  currentUserAddress: string;
  isOpen: boolean;
  onClose: () => void;
  onMergeSuccess?: (mergedProject: Project) => void;
}

export default function DuplicateMergeModal({
  targetProject,
  sourceProject,
  currentUserAddress,
  isOpen,
  onClose,
  onMergeSuccess,
}: DuplicateMergeModalProps) {
  const [suggestion, setSuggestion] = useState(() =>
    suggestMerge(targetProject, sourceProject),
  );
  const [decisions, setDecisions] = useState<FieldMergeDecision[]>(
    suggestion.fieldDecisions,
  );
  const [isMerging, setIsMerging] = useState(false);

  if (!isOpen) return null;

  const handleFieldResolutionChange = (
    field: string,
    strategy: "target" | "source" | "combine_unique" | "longest",
  ) => {
    setDecisions((prev) =>
      prev.map((dec) => {
        if (dec.field !== field) return dec;

        let resolvedValue: unknown;
        if (strategy === "target") resolvedValue = dec.targetValue;
        else if (strategy === "source") resolvedValue = dec.sourceValue;
        else if (strategy === "longest") {
          const tStr = String(dec.targetValue || "");
          const sStr = String(dec.sourceValue || "");
          resolvedValue = sStr.length > tStr.length ? sStr : tStr;
        } else if (strategy === "combine_unique") {
          const tArr = Array.isArray(dec.targetValue) ? dec.targetValue : [];
          const sArr = Array.isArray(dec.sourceValue) ? dec.sourceValue : [];
          resolvedValue = Array.from(new Set([...tArr, ...sArr]));
        }

        return {
          ...dec,
          strategy,
          resolvedValue,
        };
      }),
    );
  };

  const handleApplyMerge = async () => {
    setIsMerging(true);
    try {
      const result = executeMerge({
        targetProject,
        sourceProject,
        customDecisions: decisions,
        mergedBy: currentUserAddress || "admin_moderator",
      });

      if (result.success) {
        toast.success(
          `Merged "${sourceProject.name}" into "${targetProject.name}" successfully!`,
          {
            description: `History snapshot saved with ID: ${result.record.id}. You can restore this merge at any time.`,
          },
        );
        onMergeSuccess?.(result.mergedProject);
        onClose();
      }
    } catch (err) {
      toast.error("Failed to execute merge operation", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Merge Duplicate Submissions</h2>
              <p className="text-xs text-zinc-500">
                Resolve conflicts field-by-field and create an audited merge snapshot.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Header */}
        <div className="grid grid-cols-2 gap-4 p-6 bg-zinc-100/50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 text-sm">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-blue-200 dark:border-blue-900/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Target (Primary / Kept Record)
            </span>
            <h3 className="font-bold text-base mt-1 text-zinc-900 dark:text-zinc-100">
              {targetProject.name}
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{targetProject.id}</p>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-amber-200 dark:border-amber-900/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Source (Duplicate Candidate)
            </span>
            <h3 className="font-bold text-base mt-1 text-zinc-900 dark:text-zinc-100">
              {sourceProject.name}
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{sourceProject.id}</p>
          </div>
        </div>

        {/* Field Resolution Matrix */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
              Field Comparison & Resolution
            </h4>
            <span className="text-xs text-zinc-500">
              {suggestion.conflictCount} conflict{suggestion.conflictCount !== 1 ? "s" : ""} detected
            </span>
          </div>

          {decisions.map((decision) => {
            const isArray = Array.isArray(decision.targetValue) || Array.isArray(decision.sourceValue);

            return (
              <div
                key={decision.field}
                className={`p-4 rounded-xl border transition-all ${
                  decision.conflict
                    ? "border-amber-300 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/30"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold capitalize text-zinc-900 dark:text-zinc-100">
                      {decision.field}
                    </span>
                    {decision.conflict && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Conflict
                      </span>
                    )}
                  </div>

                  {/* Strategy Selectors */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleFieldResolutionChange(decision.field, "target")}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                        decision.strategy === "target"
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                      }`}
                    >
                      Use Target
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFieldResolutionChange(decision.field, "source")}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                        decision.strategy === "source"
                          ? "bg-amber-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                      }`}
                    >
                      Use Source
                    </button>
                    {isArray && (
                      <button
                        type="button"
                        onClick={() =>
                          handleFieldResolutionChange(decision.field, "combine_unique")
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                          decision.strategy === "combine_unique"
                            ? "bg-purple-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                        }`}
                      >
                        Combine Both
                      </button>
                    )}
                    {typeof decision.targetValue === "string" &&
                      decision.field === "description" && (
                        <button
                          type="button"
                          onClick={() => handleFieldResolutionChange(decision.field, "longest")}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                            decision.strategy === "longest"
                              ? "bg-emerald-600 text-white"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                          }`}
                        >
                          Longest Text
                        </button>
                      )}
                  </div>
                </div>

                {/* Values preview */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block mb-1">Target value:</span>
                    <p className="font-mono text-zinc-700 dark:text-zinc-300 break-words">
                      {Array.isArray(decision.targetValue)
                        ? decision.targetValue.join(", ") || "(empty array)"
                        : String(decision.targetValue || "(empty)")}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block mb-1">Source value:</span>
                    <p className="font-mono text-zinc-700 dark:text-zinc-300 break-words">
                      {Array.isArray(decision.sourceValue)
                        ? decision.sourceValue.join(", ") || "(empty array)"
                        : String(decision.sourceValue || "(empty)")}
                    </p>
                  </div>
                </div>

                {/* Resolution Output */}
                <div className="mt-2 text-xs flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                  <span className="text-[10px] uppercase font-bold text-green-600 dark:text-green-400">
                    Result:
                  </span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate">
                    {Array.isArray(decision.resolvedValue)
                      ? `[${decision.resolvedValue.join(", ")}]`
                      : String(decision.resolvedValue || "(empty)")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            A full rollback snapshot will be retained in Merge History.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isMerging}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyMerge}
              disabled={isMerging}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <GitMerge className="w-4 h-4" />
              {isMerging ? "Merging..." : "Confirm & Merge Submissions"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
