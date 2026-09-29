"use client";

/**
 * FormAnalyticsPanel
 *
 * Dashboard section displaying aggregated form analytics data:
 *   - Issue #522: field interaction stats (focus, change, validation)
 *   - Issue #523: validation performance metrics with slow-validation highlights
 *   - Issue #521: submission funnel (attempts → successes, errors, abandonments)
 *
 * Data comes from the in-memory form-aggregator, so it reflects the current
 * browser session only. On a production deployment this would be read from a
 * server-side store or analytics service.
 */

import React, { useEffect, useState } from "react";
import type {
  FormAnalyticsAggregates,
  FieldInteractionStats,
  ValidationPerfStats,
  FormSubmissionStats,
} from "@/lib/analytics/form-aggregator";
import { getFormAnalyticsAggregates } from "@/lib/analytics/form-aggregator";

interface FormAnalyticsPanelProps {
  /** Poll interval in ms. Defaults to 5000 (5 s). Pass 0 to disable polling. */
  pollIntervalMs?: number;
}

export default function FormAnalyticsPanel({ pollIntervalMs = 5000 }: FormAnalyticsPanelProps) {
  const [data, setData] = useState<FormAnalyticsAggregates>(() => getFormAnalyticsAggregates());

  useEffect(() => {
    // Initial read
    setData(getFormAnalyticsAggregates());
    if (pollIntervalMs <= 0) return;
    const id = setInterval(() => {
      setData(getFormAnalyticsAggregates());
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs]);

  const hasAnyData =
    data.submissions.length > 0 ||
    data.fieldInteractions.length > 0 ||
    data.validationPerf.length > 0;

  if (!hasAnyData) {
    return (
      <EmptyState message="No form analytics data collected yet. Interact with any form to start seeing data here." />
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Issue #521: Submission funnel ───────────────────────────────── */}
      {data.submissions.length > 0 && (
        <section aria-labelledby="form-submissions-heading">
          <h2 id="form-submissions-heading" className="mb-3 text-lg font-semibold">
            Form Submissions
          </h2>
          <div className="space-y-4">
            {data.submissions.map((s) => (
              <SubmissionCard key={s.formId} stats={s} />
            ))}
          </div>
        </section>
      )}

      {/* ── Issue #522: Field interactions ──────────────────────────────── */}
      {data.fieldInteractions.length > 0 && (
        <section aria-labelledby="field-interactions-heading">
          <h2 id="field-interactions-heading" className="mb-3 text-lg font-semibold">
            Field Interactions
          </h2>
          <p className="mb-3 text-xs text-zinc-500">
            Sorted by focus count — most interacted fields first.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">Form</th>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2 text-right">Focuses</th>
                  <th className="px-3 py-2 text-right">Changes</th>
                  <th className="px-3 py-2 text-right">Val. Errors</th>
                  <th className="px-3 py-2 text-right">Val. OK</th>
                  <th className="px-3 py-2">Top Error</th>
                </tr>
              </thead>
              <tbody>
                {data.fieldInteractions.map((f) => (
                  <FieldInteractionRow key={`${f.formId}::${f.fieldName}`} stats={f} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Issue #523: Validation performance ──────────────────────────── */}
      {data.validationPerf.length > 0 && (
        <section aria-labelledby="validation-perf-heading">
          <h2 id="validation-perf-heading" className="mb-3 text-lg font-semibold">
            Validation Performance
          </h2>
          <p className="mb-3 text-xs text-zinc-500">
            Validations over 100 ms are flagged as slow. Sorted by average duration.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">Form</th>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2 text-right">Samples</th>
                  <th className="px-3 py-2 text-right">Avg (ms)</th>
                  <th className="px-3 py-2 text-right">Max (ms)</th>
                  <th className="px-3 py-2 text-right">Min (ms)</th>
                  <th className="px-3 py-2 text-right">Slow</th>
                  <th className="px-3 py-2 text-right">Debounce (ms)</th>
                </tr>
              </thead>
              <tbody>
                {data.validationPerf.map((p) => (
                  <ValidationPerfRow
                    key={`${p.formId}::${p.fieldName ?? "_form_"}`}
                    stats={p}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-zinc-400 text-right">
        Last updated: {new Date(data.updatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubmissionCard({ stats }: { stats: FormSubmissionStats }) {
  const successRate =
    stats.attempts > 0 ? ((stats.successes / stats.attempts) * 100).toFixed(1) : "—";
  const abandonRate =
    stats.attempts > 0 ? ((stats.abandonments / stats.attempts) * 100).toFixed(1) : "—";

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold capitalize">{stats.formId.replace(/-/g, " ")}</span>
        <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
          {stats.attempts} attempt{stats.attempts !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Success rate" value={`${successRate}%`} />
        <Metric label="Successes" value={String(stats.successes)} />
        <Metric label="Errors" value={String(stats.errors)} highlight={stats.errors > 0} />
        <Metric label="Abandonment rate" value={`${abandonRate}%`} highlight={stats.abandonments > 0} />
      </div>

      {stats.avgSuccessDurationMs != null && (
        <p className="text-xs text-zinc-500">
          Avg. submission time:{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {stats.avgSuccessDurationMs.toFixed(0)} ms
          </span>
        </p>
      )}

      {stats.topErrorCodes.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Top error codes:</p>
          <ul className="flex flex-wrap gap-2">
            {stats.topErrorCodes.map(({ code, count }) => (
              <li
                key={code}
                className="text-xs font-mono bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-lg"
              >
                {code} ×{count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FieldInteractionRow({ stats }: { stats: FieldInteractionStats }) {
  const topError = stats.topErrorCodes[0];
  const hasErrors = stats.validationErrors > 0;

  return (
    <tr className="border-t border-zinc-100 dark:border-zinc-800">
      <td className="px-3 py-2 text-xs text-zinc-500">{stats.formId}</td>
      <td className="px-3 py-2 font-medium font-mono text-xs">{stats.fieldName}</td>
      <td className="px-3 py-2 text-right">{stats.focusCount}</td>
      <td className="px-3 py-2 text-right">{stats.changeCount}</td>
      <td className={`px-3 py-2 text-right ${hasErrors ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>
        {stats.validationErrors}
      </td>
      <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">
        {stats.validationSuccesses}
      </td>
      <td className="px-3 py-2 text-xs font-mono text-zinc-500">
        {topError ? `${topError.code} (×${topError.count})` : "—"}
      </td>
    </tr>
  );
}

function ValidationPerfRow({ stats }: { stats: ValidationPerfStats }) {
  const isSlow = stats.avgDurationMs > 100;

  return (
    <tr className="border-t border-zinc-100 dark:border-zinc-800">
      <td className="px-3 py-2 text-xs text-zinc-500">{stats.formId}</td>
      <td className="px-3 py-2 font-medium font-mono text-xs">
        {stats.fieldName ?? <span className="text-zinc-400 italic">form-level</span>}
      </td>
      <td className="px-3 py-2 text-right">{stats.sampleCount}</td>
      <td className={`px-3 py-2 text-right font-medium ${isSlow ? "text-amber-600 dark:text-amber-400" : ""}`}>
        {stats.avgDurationMs.toFixed(1)}
        {isSlow && (
          <span className="ml-1 text-xs text-amber-500" aria-label="slow">⚠</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">{stats.maxDurationMs.toFixed(1)}</td>
      <td className="px-3 py-2 text-right">{stats.minDurationMs.toFixed(1)}</td>
      <td className={`px-3 py-2 text-right ${stats.slowCount > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}`}>
        {stats.slowCount}
      </td>
      <td className="px-3 py-2 text-right text-zinc-500">
        {stats.avgDebounceDelayMs != null ? stats.avgDebounceDelayMs.toFixed(0) : "—"}
      </td>
    </tr>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${highlight ? "text-red-600 dark:text-red-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
