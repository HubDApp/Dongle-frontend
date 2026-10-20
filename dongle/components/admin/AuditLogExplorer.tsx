"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { AUDIT_ACTION_LABELS, type AuditAction, type AuditLogEntry } from "@/types/audit-log";
import { formatDate } from "@/lib/date";
import AddressDisplay from "@/components/ui/AddressDisplay";
import Pagination from "@/components/ui/Pagination";
import { usePagination } from "@/hooks/usePagination";

const PAGE_SIZE = 100;
const ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];

type StatusFilter = "all" | "success" | "failure" | "info";

function statusOf(action: AuditAction): Exclude<StatusFilter, "all"> {
  if (action.includes("approved") || action.includes("resolved") || action.includes("verified")) return "success";
  if (action.includes("rejected") || action.includes("dismissed") || action.includes("failed")) return "failure";
  return "info";
}

function toCsv(entries: AuditLogEntry[]): string {
  const escape = (value: string): string =>
    value.includes(",") || value.includes('"') || value.includes("\n")
      ? `"${value.replace(/"/g, '""')}"`
      : value;
  const header = "id,actor,action,targetId,targetLabel,timestamp,reason";
  const rows = entries.map((e) =>
    [e.id, e.actor, e.action, e.targetId, e.targetLabel, e.timestamp, e.reason ?? ""]
      .map(escape)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

interface AuditLogExplorerProps {
  initialEntries: AuditLogEntry[];
  retentionDays?: number;
}

export default function AuditLogExplorer({ initialEntries, retentionDays = 90 }: AuditLogExplorerProps) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<"" | AuditAction>("");
  const [actor, setActor] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialEntries.filter((entry) => {
      if (action && entry.action !== action) return false;
      if (actor && !entry.actor.toLowerCase().includes(actor.trim().toLowerCase())) return false;
      if (status !== "all" && statusOf(entry.action) !== status) return false;
      if (from && new Date(entry.timestamp).getTime() < new Date(from).getTime()) return false;
      if (to && new Date(entry.timestamp).getTime() > new Date(`${to}T23:59:59`).getTime()) return false;
      if (q && !`${entry.targetId} ${entry.targetLabel} ${entry.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [initialEntries, query, action, actor, status, from, to]);

  const pagination = usePagination({ items: filtered, itemsPerPage: PAGE_SIZE });

  const toggleRow = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportFile = (kind: "csv" | "json") => {
    const content = kind === "csv" ? toCsv(filtered) : JSON.stringify(filtered, null, 2);
    const blob = new Blob([content], { type: kind === "csv" ? "text/csv" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs.${kind}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl">
        <label className="lg:col-span-2 text-xs font-semibold uppercase text-zinc-500">
          Search resource ID
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Resource, target, or entry ID…"
            className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-normal normal-case"
          />
        </label>
        <label className="text-xs font-semibold uppercase text-zinc-500">
          Action type
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as AuditAction | "")}
            className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-normal normal-case"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase text-zinc-500">
          User
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="G… wallet"
            className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-normal normal-case"
          />
        </label>
        <label className="text-xs font-semibold uppercase text-zinc-500">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-normal normal-case"
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="info">Info</option>
          </select>
        </label>
        <div className="flex gap-2">
          <label className="flex-1 text-xs font-semibold uppercase text-zinc-500">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-normal" />
          </label>
          <label className="flex-1 text-xs font-semibold uppercase text-zinc-500">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-normal" />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {filtered.length} result{filtered.length === 1 ? "" : "s"} • retention {retentionDays} days (configurable)
        </p>
        <div className="flex gap-2">
          <button onClick={() => exportFile("csv")} className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => exportFile("json")} className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold">
            <Download className="w-4 h-4" /> JSON
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              {["", "Timestamp", "User", "Action", "Resource", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
            {pagination.paginatedItems.map((entry) => {
              const open = expanded.has(entry.id);
              return (
                <Fragment key={entry.id}>
                  <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <button aria-label={open ? "Collapse row" : "Expand row"} aria-expanded={open} onClick={() => toggleRow(entry.id)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-zinc-500">{formatDate(entry.timestamp, "short")}</td>
                    <td className="px-4 py-3 font-mono text-xs"><AddressDisplay address={entry.actor} copyable truncated inline /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-bold uppercase">{AUDIT_ACTION_LABELS[entry.action]}</td>
                    <td className="px-4 py-3 font-mono text-xs">{entry.targetId}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs uppercase font-bold text-zinc-500">{statusOf(entry.action)}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/40 text-xs">
                        <div className="grid sm:grid-cols-2 gap-2">
                          <p><span className="font-bold">Target:</span> {entry.targetLabel}</p>
                          <p><span className="font-bold">Entry ID:</span> <span className="font-mono">{entry.id}</span></p>
                          <p className="sm:col-span-2"><span className="font-bold">Reason:</span> {entry.reason ?? "—"}</p>
                          <pre className="sm:col-span-2 overflow-x-auto bg-zinc-950 text-zinc-100 p-3 rounded-xl">{JSON.stringify({ metadata: entry.metadata ?? {}, timestamp: entry.timestamp }, null, 2)}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {pagination.paginatedItems.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">No audit entries match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={Math.max(pagination.totalPages, 1)}
        onPageChange={pagination.goToPage}
        itemsPerPage={PAGE_SIZE}
        totalItems={pagination.totalItems}
      />
    </div>
  );
}
