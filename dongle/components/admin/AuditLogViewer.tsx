"use client";

/**
 * AuditLogViewer
 *
 * Read-only table that lists all admin audit log entries.
 * No edit or delete controls are rendered — this panel is intentionally
 * display-only to satisfy the acceptance criterion that logs cannot be
 * edited from the regular admin UI.
 */

import { AuditLogEntry, AUDIT_ACTION_LABELS } from "@/types/audit-log";
import { formatDate } from "@/lib/date";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { ScrollText } from "lucide-react";

interface AuditLogViewerProps {
  entries: AuditLogEntry[];
}

/** Badge colour keyed by action. */
function actionClass(action: AuditLogEntry["action"]): string {
  switch (action) {
    case "verification_approved":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "verification_rejected":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "fee_updated":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "report_resolved":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
    case "report_dismissed":
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    default:
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

export default function AuditLogViewer({ entries }: AuditLogViewerProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
        <ScrollText className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
        <p className="font-medium text-zinc-500 dark:text-zinc-400">No audit log entries yet</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
          Admin actions will appear here once they are performed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-2 h-8 bg-violet-500 rounded-full" />
          Audit Log
        </h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} — read-only
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
                Timestamp
              </th>
              <th className="text-left px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
                Actor
              </th>
              <th className="text-left px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
                Action
              </th>
              <th className="text-left px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
                Target
              </th>
              <th className="text-left px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
                Reason
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                  {formatDate(entry.timestamp, "short")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                  <AddressDisplay
                    address={entry.actor}
                    copyable
                    truncated
                    inline
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${actionClass(entry.action)}`}
                  >
                    {AUDIT_ACTION_LABELS[entry.action]}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                  {entry.targetLabel}
                </td>
                <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
                  {entry.reason ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl space-y-2"
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${actionClass(entry.action)}`}
              >
                {AUDIT_ACTION_LABELS[entry.action]}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {formatDate(entry.timestamp, "short")}
              </span>
            </div>
            <div className="text-sm font-medium">{entry.targetLabel}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Actor:{" "}
              <AddressDisplay address={entry.actor} copyable truncated inline />
            </div>
            {entry.reason && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Reason: {entry.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
