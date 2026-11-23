"use client";

import React, { useState, useMemo } from "react";
import {
  saveCustomSegment,
  evaluateRuleGroup,
  type SubmissionSegment,
  type SegmentRule,
  type SegmentRuleOperator,
} from "@/services/form-segmentation";
import type { ProjectSubmission } from "@/types/project";
import { Plus, Trash2, X, Check, Eye } from "lucide-react";
import { toast } from "sonner";

interface CustomSegmentModalProps {
  isOpen: boolean;
  initialSegment?: SubmissionSegment | null;
  submissions: ProjectSubmission[];
  onClose: () => void;
  onSaved: () => void;
}

const FIELD_OPTIONS = [
  { value: "primaryCategory", label: "Category" },
  { value: "qualityScore", label: "Quality Score" },
  { value: "status", label: "Status" },
  { value: "hasContracts", label: "Has Smart Contracts" },
  { value: "hasAudit", label: "Has Audit Report" },
  { value: "hasBugBounty", label: "Has Bug Bounty" },
  { value: "flagCount", label: "Number of Suspicious Flags" },
];

const OPERATOR_OPTIONS: { value: SegmentRuleOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "notEquals", label: "does not equal" },
  { value: "greaterThanOrEqual", label: "is at least (>=)" },
  { value: "lessThan", label: "is less than (<)" },
  { value: "contains", label: "contains" },
  { value: "isEmpty", label: "is empty" },
  { value: "isNotEmpty", label: "is not empty" },
];

const COLOR_PRESETS = [
  {
    color: "#3b82f6",
    badgeBg: "bg-blue-100 dark:bg-blue-900/30",
    badgeText: "text-blue-700 dark:text-blue-400",
  },
  {
    color: "#8b5cf6",
    badgeBg: "bg-purple-100 dark:bg-purple-900/30",
    badgeText: "text-purple-700 dark:text-purple-400",
  },
  {
    color: "#10b981",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/30",
    badgeText: "text-emerald-700 dark:text-emerald-400",
  },
  {
    color: "#f59e0b",
    badgeBg: "bg-amber-100 dark:bg-amber-900/30",
    badgeText: "text-amber-700 dark:text-amber-400",
  },
  {
    color: "#ec4899",
    badgeBg: "bg-pink-100 dark:bg-pink-900/30",
    badgeText: "text-pink-700 dark:text-pink-400",
  },
  {
    color: "#06b6d4",
    badgeBg: "bg-cyan-100 dark:bg-cyan-900/30",
    badgeText: "text-cyan-700 dark:text-cyan-400",
  },
];

export default function CustomSegmentModal({
  isOpen,
  initialSegment,
  submissions,
  onClose,
  onSaved,
}: CustomSegmentModalProps) {
  const [name, setName] = useState(initialSegment?.name || "");
  const [description, setDescription] = useState(
    initialSegment?.description || "",
  );
  const [colorIndex, setColorIndex] = useState(0);
  const [logic, setLogic] = useState<"AND" | "OR">(
    initialSegment?.ruleGroup?.logic || "AND",
  );
  const [rules, setRules] = useState<SegmentRule[]>(() => {
    if (initialSegment?.ruleGroup?.rules?.length) {
      return initialSegment.ruleGroup.rules.filter(
        (r): r is SegmentRule => "field" in r,
      );
    }
    return [{ field: "primaryCategory", operator: "equals", value: "DeFi / DEX" }];
  });

  if (!isOpen) return null;

  const handleAddRule = () => {
    setRules((prev) => [
      ...prev,
      { field: "qualityScore", operator: "greaterThanOrEqual", value: "70" },
    ]);
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRule = (
    index: number,
    field: keyof SegmentRule,
    val: unknown,
  ) => {
    setRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: val } : r)),
    );
  };

  // Real-time preview of matching submissions
  const matchCount = useMemo(() => {
    const candidateGroup = { logic, rules };
    return submissions.filter((sub) => evaluateRuleGroup(sub, candidateGroup))
      .length;
  }, [submissions, logic, rules]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a segment name");
      return;
    }
    if (rules.length === 0) {
      toast.error("Please define at least one rule");
      return;
    }

    const preset = COLOR_PRESETS[colorIndex];
    saveCustomSegment({
      id: initialSegment?.id,
      name: name.trim(),
      description: description.trim(),
      color: preset.color,
      badgeBg: preset.badgeBg,
      badgeText: preset.badgeText,
      priority: 10,
      isActive: true,
      ruleGroup: {
        logic,
        rules,
      },
    });

    toast.success(`Custom segment "${name}" saved!`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold">
              {initialSegment ? "Edit Custom Segment" : "Create Custom Segment"}
            </h2>
            <p className="text-xs text-zinc-500">
              Define matching criteria to group and filter submissions automatically.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="font-bold block mb-1">Segment Name</label>
              <input
                type="text"
                placeholder="e.g. High-Volume Payments"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Description</label>
              <input
                type="text"
                placeholder="Brief summary of what this segment represents"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
              />
            </div>
          </div>

          {/* Color preset */}
          <div>
            <label className="font-bold block mb-1.5">Color Badge</label>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((p, idx) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setColorIndex(idx)}
                  className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                    colorIndex === idx ? "ring-2 ring-offset-2 ring-purple-500" : ""
                  }`}
                  style={{ backgroundColor: p.color }}
                >
                  {colorIndex === idx && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Rules Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold">Segment Matching Rules</label>
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setLogic("AND")}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    logic === "AND" ? "bg-white dark:bg-zinc-700 shadow-sm" : ""
                  }`}
                >
                  Match ALL (AND)
                </button>
                <button
                  type="button"
                  onClick={() => setLogic("OR")}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    logic === "OR" ? "bg-white dark:bg-zinc-700 shadow-sm" : ""
                  }`}
                >
                  Match ANY (OR)
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                >
                  <select
                    value={rule.field}
                    onChange={(e) => handleUpdateRule(idx, "field", e.target.value)}
                    className="px-2 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  >
                    {FIELD_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={rule.operator}
                    onChange={(e) =>
                      handleUpdateRule(idx, "operator", e.target.value as SegmentRuleOperator)
                    }
                    className="px-2 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  >
                    {OPERATOR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  {rule.operator !== "isEmpty" && rule.operator !== "isNotEmpty" && (
                    <input
                      type="text"
                      placeholder="Value"
                      value={String(rule.value ?? "")}
                      onChange={(e) => handleUpdateRule(idx, "value", e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  )}

                  {rules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddRule}
              className="mt-2.5 text-xs text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Condition Rule
            </button>
          </div>

          {/* Live Preview */}
          <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-500" />
              <span className="font-bold">Live Submissions Preview</span>
            </div>
            <span className="font-bold text-purple-700 dark:text-purple-400">
              {matchCount} submission{matchCount !== 1 ? "s" : ""} match
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md shadow-purple-500/20"
          >
            Save Segment
          </button>
        </div>
      </div>
    </div>
  );
}
