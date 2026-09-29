"use client";

import React, { useState, useMemo } from "react";
import { RotateCcw, ArrowRight, Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "./Button";

export interface FormValueComparisonProps {
  /**
   * Original form values before modifications.
   */
  originalValues: Record<string, any>;
  /**
   * Current working form values.
   */
  currentValues: Record<string, any>;
  /**
   * Human-readable labels for field keys.
   */
  fieldLabels?: Record<string, string>;
  /**
   * List of specific field keys to compare. If omitted, derives from keys of originalValues/currentValues.
   */
  fields?: string[];
  /**
   * Callback when a single field is reverted to its original value.
   */
  onResetField?: (fieldKey: string, originalValue: any) => void;
  /**
   * Callback when all modified fields are reverted to original values.
   */
  onResetAll?: (originalValues: Record<string, any>) => void;
  /**
   * Whether to show only modified fields by default.
   * @default false
   */
  defaultShowOnlyModified?: boolean;
  /**
   * Title for the comparison panel.
   * @default "Compare Changes"
   */
  title?: string;
  /**
   * Optional custom class name.
   */
  className?: string;
}

/**
 * Normalizes values for comparison so empty string and undefined/null are handled cleanly.
 */
function normalizeVal(val: any): any {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val.trim();
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === "string" ? v.trim() : v)).filter((v) => v !== "");
  }
  return val;
}

/**
 * Determines whether two values are considered different.
 */
export function areValuesDifferent(a: any, b: any): boolean {
  const normA = normalizeVal(a);
  const normB = normalizeVal(b);

  if (Array.isArray(normA) && Array.isArray(normB)) {
    if (normA.length !== normB.length) return true;
    return normA.some((item, idx) => item !== normB[idx]);
  }

  if (typeof normA === "object" && normA !== null && typeof normB === "object" && normB !== null) {
    return JSON.stringify(normA) !== JSON.stringify(normB);
  }

  return normA !== normB;
}

/**
 * Renders a value cleanly with support for primitives, arrays, and empty states.
 */
function renderFormattedValue(value: any) {
  const norm = normalizeVal(value);

  if (norm === "" || norm === null || norm === undefined) {
    return <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">(empty)</span>;
  }

  if (Array.isArray(norm)) {
    if (norm.length === 0) {
      return <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">(none)</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {norm.map((item, idx) => (
          <span
            key={idx}
            className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  if (typeof norm === "boolean") {
    return <span>{norm ? "Yes" : "No"}</span>;
  }

  return <span className="break-all">{String(norm)}</span>;
}

/**
 * FormValueComparison displays a clear, side-by-side comparison between
 * original and current form values, highlights differences, and allows reverting
 * fields individually or altogether.
 */
export function FormValueComparison({
  originalValues,
  currentValues,
  fieldLabels = {},
  fields,
  onResetField,
  onResetAll,
  defaultShowOnlyModified = false,
  title = "Compare Form Values",
  className = "",
}: FormValueComparisonProps) {
  const [showOnlyModified, setShowOnlyModified] = useState(defaultShowOnlyModified);

  const keys = useMemo(() => {
    if (fields && fields.length > 0) return fields;
    const combined = new Set([...Object.keys(originalValues || {}), ...Object.keys(currentValues || {})]);
    return Array.from(combined);
  }, [fields, originalValues, currentValues]);

  const comparisons = useMemo(() => {
    return keys.map((key) => {
      const orig = originalValues?.[key];
      const curr = currentValues?.[key];
      const isDiff = areValuesDifferent(orig, curr);
      const label = fieldLabels[key] || key;
      return {
        key,
        label,
        originalValue: orig,
        currentValue: curr,
        isDifferent: isDiff,
      };
    });
  }, [keys, originalValues, currentValues, fieldLabels]);

  const modifiedItems = useMemo(() => comparisons.filter((c) => c.isDifferent), [comparisons]);
  const displayedItems = showOnlyModified ? modifiedItems : comparisons;

  const handleResetAll = () => {
    if (!onResetAll) return;
    onResetAll(originalValues);
  };

  return (
    <div
      role="region"
      aria-label={title}
      className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <span
              data-testid="difference-count-badge"
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                modifiedItems.length > 0
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                  : "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200"
              }`}
            >
              {modifiedItems.length === 0
                ? "No changes"
                : `${modifiedItems.length} field${modifiedItems.length > 1 ? "s" : ""} modified`}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Side-by-side comparison of original baseline values versus current edits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle filter */}
          <button
            type="button"
            onClick={() => setShowOnlyModified(!showOnlyModified)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            {showOnlyModified ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showOnlyModified ? "Show all fields" : `Show modified only (${modifiedItems.length})`}
          </button>

          {/* Reset All Changes */}
          {onResetAll && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={modifiedItems.length === 0}
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All
            </Button>
          )}
        </div>
      </div>

      {/* Comparison table */}
      {displayedItems.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No modified fields found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-zinc-100/70 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4 w-1/4">Field</th>
                <th className="py-3 px-4 w-1/3">Original Value</th>
                <th className="py-3 px-4 w-1/3">Current Value</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
              {displayedItems.map((item) => (
                <tr
                  key={item.key}
                  data-testid={`comparison-row-${item.key}`}
                  className={`transition-colors ${
                    item.isDifferent
                      ? "bg-amber-50/50 dark:bg-amber-950/20"
                      : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                  }`}
                >
                  {/* Field Label */}
                  <td className="py-3.5 px-4 font-medium text-zinc-900 dark:text-zinc-100 align-top">
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.isDifferent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                          Modified
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Original Value */}
                  <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 align-top">
                    {renderFormattedValue(item.originalValue)}
                  </td>

                  {/* Current Value */}
                  <td
                    className={`py-3.5 px-4 align-top ${
                      item.isDifferent
                        ? "text-blue-900 dark:text-blue-200 font-medium"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {renderFormattedValue(item.currentValue)}
                  </td>

                  {/* Per-field Revert Action */}
                  <td className="py-3.5 px-4 text-right align-top">
                    {onResetField && item.isDifferent ? (
                      <button
                        type="button"
                        onClick={() => onResetField(item.key, item.originalValue)}
                        aria-label={`Revert ${item.label} to original`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Revert
                      </button>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-600 text-xs">
                        <Check className="w-3.5 h-3.5 inline text-green-500 mr-1" />
                        Same
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FormValueComparison;
