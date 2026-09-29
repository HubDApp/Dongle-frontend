"use client";

/**
 * FormA11yAuditPanel — Issue #526
 *
 * Developer-facing panel that runs the form accessibility audit and renders
 * a categorized report with severity badges.  Only shown in non-production
 * environments (guarded by the `show` prop so callers control visibility).
 */

import { useRef } from "react";
import { useFormA11yAudit } from "@/hooks/useFormA11yAudit";
import type { A11yIssue, A11yCheckCategory } from "@/lib/form-a11y-audit";

interface FormA11yAuditPanelProps {
  /** Ref to the form container element to audit. */
  containerRef: React.RefObject<Element | null>;
  /** Whether to render the panel at all. Default: true. */
  show?: boolean;
}

const CATEGORY_LABELS: Record<A11yCheckCategory, string> = {
  "aria-labels": "ARIA Labels",
  "color-contrast": "Color Contrast",
  "keyboard-navigation": "Keyboard Navigation",
  "focus-management": "Focus Management",
};

const SEVERITY_STYLES: Record<string, string> = {
  error:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 ring-1 ring-red-300 dark:ring-red-800",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-800",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-800",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info}`}
    >
      {severity}
    </span>
  );
}

function IssueRow({ issue }: { issue: A11yIssue }) {
  return (
    <li className="space-y-1 rounded-lg border border-zinc-200 bg-white/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={issue.severity} />
        <code className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
          {issue.ruleId}
        </code>
        {issue.element && (
          <code className="text-xs font-mono text-zinc-500 dark:text-zinc-500">
            {issue.element}
          </code>
        )}
      </div>
      <p className="text-xs text-zinc-700 dark:text-zinc-300">{issue.message}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        <span className="font-medium">Fix: </span>
        {issue.suggestion}
      </p>
    </li>
  );
}

export function FormA11yAuditPanel({
  containerRef,
  show = true,
}: FormA11yAuditPanelProps) {
  const { result, running, run, clear } = useFormA11yAudit(containerRef);

  if (!show) return null;

  const groupedByCategory = result
    ? result.issues.reduce<Record<string, A11yIssue[]>>((acc, issue) => {
        (acc[issue.category] ??= []).push(issue);
        return acc;
      }, {})
    : {};

  const categories = Object.keys(groupedByCategory) as A11yCheckCategory[];

  return (
    <section
      aria-label="Accessibility Audit Panel"
      className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Accessibility Audit
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={run}
            disabled={running}
            aria-busy={running}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {running ? (
              <>
                <span
                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
                Running…
              </>
            ) : (
              "Run Audit"
            )}
          </button>
          {result && (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-3 space-y-4">
          {/* Summary banner */}
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              result.passed
                ? "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            {result.passed
              ? "✓ No errors found. All checks passed."
              : `✗ ${result.errorCount} error${result.errorCount !== 1 ? "s" : ""}, ${result.warningCount} warning${result.warningCount !== 1 ? "s" : ""} found.`}
            <span className="ml-2 text-zinc-500 dark:text-zinc-500">
              {result.timestamp}
            </span>
          </div>

          {/* Issues grouped by category */}
          {categories.length > 0 && (
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    {CATEGORY_LABELS[category] ?? category}
                    <span className="ml-1.5 font-normal text-zinc-400">
                      ({groupedByCategory[category].length})
                    </span>
                  </h4>
                  <ul className="space-y-2" aria-label={`${CATEGORY_LABELS[category]} issues`}>
                    {groupedByCategory[category].map((issue, i) => (
                      <IssueRow key={`${issue.ruleId}-${i}`} issue={issue} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {categories.length === 0 && result.passed && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No accessibility issues to display.
            </p>
          )}
        </div>
      )}

      {!result && !running && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Click "Run Audit" to check ARIA labels, color contrast, keyboard navigation, and focus management.
        </p>
      )}
    </section>
  );
}
