import type { WalletTransaction } from "@/hooks/useWalletTransactions";

export const CSV_COLUMNS = ["date", "type", "status", "hash", "amount", "memo"] as const;
/** UTF-8 byte-order mark so Excel detects the encoding. */
export const UTF8_BOM = "﻿";

export interface DateRange {
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
}

function escapeCell(value: string): string {
  // Guard against CSV formula injection in spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function filterByDateRange(
  txs: WalletTransaction[],
  range: DateRange = {},
): WalletTransaction[] {
  const from = range.from ? new Date(`${range.from}T00:00:00Z`).getTime() : -Infinity;
  const to = range.to ? new Date(`${range.to}T23:59:59.999Z`).getTime() : Infinity;
  return txs.filter((tx) => {
    const t = new Date(tx.createdAt).getTime();
    return t >= from && t <= to;
  });
}

export function toCsvRows(txs: WalletTransaction[]): string[][] {
  return txs.map((tx) => [tx.createdAt, tx.type, tx.status, tx.hash, tx.amount, tx.memo]);
}

export function buildTransactionCsv(txs: WalletTransaction[]): string {
  const lines = [CSV_COLUMNS.join(","), ...toCsvRows(txs).map((r) => r.map(escapeCell).join(","))];
  return UTF8_BOM + lines.join("\r\n");
}

export function transactionCsvFilename(date = new Date()): string {
  return `transactions-${date.toISOString().slice(0, 10)}.csv`;
}

export function downloadTransactionCsv(txs: WalletTransaction[]): string {
  const filename = transactionCsvFilename();
  const blob = new Blob([buildTransactionCsv(txs)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
}
