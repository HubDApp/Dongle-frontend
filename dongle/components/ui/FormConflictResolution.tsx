"use client";

/**
 * FormConflictResolution
 *
 * Side-by-side conflict resolution panel for form data.
 * Shown when the local draft conflicts with a newer server version.
 *
 * Features:
 * - Shows "Your version" vs "Server version" columns
 * - Highlights fields that differ
 * - Per-field choice: keep yours or take theirs
 * - Bulk actions: keep all yours / take all theirs
 * - Displays timestamps for each version
 * - Clear instructional header
 *
 * Issue #520 – Create form comparison view for conflicts
 */

import React, { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Clock, Laptop, Server } from "lucide-react";
import { Button } from "./Button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One version of form data. */
export interface FormVersion {
  /** The field values in this version. */
  values: Record<string, unknown>;
  /**
   * ISO timestamp (or unix ms) representing when this version was saved.
   * Used for the "last saved" label.
   */
  savedAt: string | number;
  /** Display label for the source, e.g. "Your browser" or "Server". */
  label?: string;
}

export interface FormConflictResolutionProps {
  /**
   * The local (yours) version of the form, typically the unsaved draft.
   */
  localVersion: FormVersion;
  /**
   * The remote (server) version, typically a more recently saved state.
   */
  serverVersion: FormVersion;
  /**
   * Human-readable labels for field keys.
   */
  fieldLabels?: Record<string, string>;
  /**
   * Explicit list of fields to show.  Derived from the union of both versions
   * when omitted.
   */
  fields?: string[];
  /**
   * Called when the user clicks "Resolve" with the chosen merged values.
   */
  onResolve: (resolvedValues: Record<string, unknown>) => void;
  /**
   * Called when the user cancels the conflict resolution modal.
   */
  onCancel?: () => void;
  /**
   * Panel title.
   * @default "Resolve Conflict"
   */
  title?: string;
  /** Optional extra class name. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseVal(v: unknown): unknown {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map((i) => (typeof i === "string" ? i.trim() : i)).filter(Boolean);
  return v;
}

function valuesAreDifferent(a: unknown, b: unknown): boolean {
  const na = normaliseVal(a);
  const nb = normaliseVal(b);
  if (Array.isArray(na) && Array.isArray(nb)) {
    if (na.length !== nb.length) return true;
    return na.some((item, i) => item !== nb[i]);
  }
  if (typeof na === "object" && na && typeof nb === "object" && nb) {
    return JSON.stringify(na) !== JSON.stringify(nb);
  }
  return na !== nb;
}

function formatTimestamp(savedAt: string | number): string {
  try {
    const d = typeof savedAt === "number" ? new Date(savedAt) : new Date(savedAt);
    if (isNaN(d.getTime())) return String(savedAt);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(savedAt);
  }
}

function RenderValue({ value }: { value: unknown }) {
  const norm = normaliseVal(value);

  if (norm === "" || norm === null || norm === undefined) {
    return <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">(empty)</span>;
  }
  if (Array.isArray(norm)) {
    if (norm.length === 0)
      return <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">(none)</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {norm.map((item, i) => (
          <span
            key={i}
            className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-700 dark:text-zinc-300"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof norm === "boolean") return <span>{norm ? "Yes" : "No"}</span>;
  return <span className="break-all">{String(norm)}</span>;
}

// Which version to keep for each conflicting field
type FieldChoice = "local" | "server";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FormConflictResolution({
  localVersion,
  serverVersion,
  fieldLabels = {},
  fields,
  onResolve,
  onCancel,
  title = "Resolve Conflict",
  className = "",
}: FormConflictResolutionProps) {
  const localLabel = localVersion.label ?? "Your version";
  const serverLabel = serverVersion.label ?? "Server version";

  // Derive the list of all field keys
  const allKeys = useMemo<string[]>(() => {
    if (fields && fields.length > 0) return fields;
    const combined = new Set([
      ...Object.keys(localVersion.values ?? {}),
      ...Object.keys(serverVersion.values ?? {}),
    ]);
    return Array.from(combined);
  }, [fields, localVersion.values, serverVersion.values]);

  // Build comparison rows
  const rows = useMemo(
    () =>
      allKeys.map((key) => ({
        key,
        label: fieldLabels[key] ?? key,
        localValue: localVersion.values?.[key],
        serverValue: serverVersion.values?.[key],
        isDifferent: valuesAreDifferent(localVersion.values?.[key], serverVersion.values?.[key]),
      })),
    [allKeys, fieldLabels, localVersion.values, serverVersion.values]
  );

  const conflictingRows = rows.filter((r) => r.isDifferent);

  // Per-field choice state (defaults to "local" — keep the user's edits)
  const [choices, setChoices] = useState<Record<string, FieldChoice>>(() => {
    const initial: Record<string, FieldChoice> = {};
    conflictingRows.forEach((r) => {
      initial[r.key] = "local";
    });
    return initial;
  });

  const setChoice = useCallback((key: string, choice: FieldChoice) => {
    setChoices((prev) => ({ ...prev, [key]: choice }));
  }, []);

  const keepAllMine = useCallback(() => {
    const next: Record<string, FieldChoice> = {};
    conflictingRows.forEach((r) => (next[r.key] = "local"));
    setChoices(next);
  }, [conflictingRows]);

  const takeAllTheirs = useCallback(() => {
    const next: Record<string, FieldChoice> = {};
    conflictingRows.forEach((r) => (next[r.key] = "server"));
    setChoices(next);
  }, [conflictingRows]);

  // Expand / collapse non-conflicting rows
  const [showUnchanged, setShowUnchanged] = useState(false);
  const unchangedRows = rows.filter((r) => !r.isDifferent);

  // Build merged result and call onResolve
  const handleResolve = useCallback(() => {
    const merged: Record<string, unknown> = {};

    // For non-conflicting fields take local (both are the same anyway)
    rows.forEach((r) => {
      if (!r.isDifferent) {
        merged[r.key] = r.localValue;
      } else {
        const choice = choices[r.key] ?? "local";
        merged[r.key] = choice === "local" ? r.localValue : r.serverValue;
      }
    });

    onResolve(merged);
  }, [rows, choices, onResolve]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      className={`rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden ${className}`}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5 border-b border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30">
        <AlertTriangle
          className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <h2
            id="conflict-title"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {title}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            The form was updated on the server while you were editing. Review the differences below
            and choose which values to keep. Fields without a conflict are shown collapsed at the
            bottom.
          </p>
        </div>
      </div>

      {/* ── Version timestamps ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5" aria-hidden="true" />
          <strong className="font-medium text-zinc-700 dark:text-zinc-300">{localLabel}</strong>
          &mdash;
          <Clock className="w-3 h-3" aria-hidden="true" />
          {formatTimestamp(localVersion.savedAt)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5" aria-hidden="true" />
          <strong className="font-medium text-zinc-700 dark:text-zinc-300">{serverLabel}</strong>
          &mdash;
          <Clock className="w-3 h-3" aria-hidden="true" />
          {formatTimestamp(serverVersion.savedAt)}
        </span>
      </div>

      {/* ── Bulk actions ───────────────────────────────────────────── */}
      {conflictingRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-2.5 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 mr-1">Select all:</span>
          <button
            type="button"
            onClick={keepAllMine}
            className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300
              hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium transition-colors"
          >
            Keep mine ({localLabel})
          </button>
          <button
            type="button"
            onClick={takeAllTheirs}
            className="px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300
              hover:bg-purple-50 dark:hover:bg-purple-900/30 font-medium transition-colors"
          >
            Take theirs ({serverLabel})
          </button>
        </div>
      )}

      {/* ── Conflicting fields table ───────────────────────────────── */}
      {conflictingRows.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No conflicting fields — the versions are identical.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase tracking-wide bg-zinc-100/60 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-2.5 px-4 w-1/5">Field</th>
                <th className="py-2.5 px-4 w-2/5">
                  <span className="inline-flex items-center gap-1">
                    <Laptop className="w-3.5 h-3.5" aria-hidden="true" />
                    {localLabel}
                  </span>
                </th>
                <th className="py-2.5 px-4 w-2/5">
                  <span className="inline-flex items-center gap-1">
                    <Server className="w-3.5 h-3.5" aria-hidden="true" />
                    {serverLabel}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {conflictingRows.map((row) => {
                const choice = choices[row.key] ?? "local";
                return (
                  <tr
                    key={row.key}
                    data-testid={`conflict-row-${row.key}`}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors"
                  >
                    {/* Field label */}
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 align-top">
                      {row.label}
                    </td>

                    {/* Local value */}
                    <td className="py-3 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => setChoice(row.key, "local")}
                        aria-pressed={choice === "local"}
                        aria-label={`Keep your value for ${row.label}`}
                        className={`w-full text-left rounded-xl p-2.5 border-2 transition-all
                          ${
                            choice === "local"
                              ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Your edit
                          </span>
                          {choice === "local" && (
                            <Check className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" aria-hidden="true" />
                          )}
                        </div>
                        <div className="text-zinc-900 dark:text-zinc-100 text-xs leading-relaxed">
                          <RenderValue value={row.localValue} />
                        </div>
                      </button>
                    </td>

                    {/* Server value */}
                    <td className="py-3 px-4 align-top">
                      <button
                        type="button"
                        onClick={() => setChoice(row.key, "server")}
                        aria-pressed={choice === "server"}
                        aria-label={`Use server value for ${row.label}`}
                        className={`w-full text-left rounded-xl p-2.5 border-2 transition-all
                          ${
                            choice === "server"
                              ? "border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-950/30"
                              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Server
                          </span>
                          {choice === "server" && (
                            <Check className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" aria-hidden="true" />
                          )}
                        </div>
                        <div className="text-zinc-900 dark:text-zinc-100 text-xs leading-relaxed">
                          <RenderValue value={row.serverValue} />
                        </div>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Unchanged fields (collapsible) ─────────────────────────── */}
      {unchangedRows.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowUnchanged((v) => !v)}
            className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
            aria-expanded={showUnchanged}
          >
            <span>
              {unchangedRows.length} field{unchangedRows.length !== 1 ? "s" : ""} without conflicts
            </span>
            {showUnchanged ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          {showUnchanged && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {unchangedRows.map((row) => (
                    <tr key={row.key} className="bg-zinc-50/30 dark:bg-zinc-800/10">
                      <td className="py-2.5 px-4 w-1/5 text-xs font-medium text-zinc-500 dark:text-zinc-400 align-top">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-zinc-600 dark:text-zinc-400 align-top" colSpan={2}>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-green-500 shrink-0" aria-hidden="true" />
                          <RenderValue value={row.localValue} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Footer actions ─────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-end gap-3 p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="button" size="sm" onClick={handleResolve} disabled={conflictingRows.length === 0}>
          Resolve & Continue
        </Button>
      </div>
    </div>
  );
}

export default FormConflictResolution;
