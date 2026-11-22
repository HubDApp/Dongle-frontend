"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { WalletTransaction } from "@/hooks/useWalletTransactions";
import { track } from "@/lib/analytics/client";
import {
  CSV_COLUMNS,
  downloadTransactionCsv,
  filterByDateRange,
  toCsvRows,
} from "@/lib/transaction-csv";

interface Props {
  transactions: WalletTransaction[];
}

const PREVIEW_ROWS = 5;

export function ExportTransactionsButton({ transactions }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"all" | "range">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const selected = useMemo(
    () => (mode === "all" ? transactions : filterByDateRange(transactions, { from, to })),
    [mode, from, to, transactions],
  );

  const handleDownload = () => {
    downloadTransactionCsv(selected);
    track("transactions_export", { mode, row_count: selected.length });
    setOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={transactions.length === 0}
        className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        Export transactions
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Export transactions"
          className="mt-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3"
        >
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={mode === "all"} onChange={() => setMode("all")} />
              All
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={mode === "range"} onChange={() => setMode("range")} />
              Date range
            </label>
            {mode === "range" && (
              <>
                <input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-transparent border rounded px-2" />
                <input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="bg-transparent border rounded px-2" />
              </>
            )}
          </fieldset>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr>{CSV_COLUMNS.map((c) => <th key={c} className="text-left pr-3">{c}</th>)}</tr>
              </thead>
              <tbody>
                {toCsvRows(selected.slice(0, PREVIEW_ROWS)).map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => <td key={j} className="pr-3 truncate max-w-[140px]">{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-zinc-500 mt-2">
              Previewing {Math.min(PREVIEW_ROWS, selected.length)} of {selected.length} rows
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={selected.length === 0}
            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportTransactionsButton;
