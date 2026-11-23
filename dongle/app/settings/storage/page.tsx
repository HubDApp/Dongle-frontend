"use client";

import { useCallback, useEffect, useState } from "react";
import { getStoredItem, removeStoredItem } from "@/lib/indexed-storage";
import {
  formatMegabytes,
  getStorageEstimate,
  type StorageEstimateResult,
} from "@/lib/storage-quota";
import { REVIEW_DRAFT_STORAGE_KEY } from "@/hooks/useReviewDraft";

const CLEARABLE = [
  { key: "dongle_project_drafts", label: "Old project drafts" },
  { key: REVIEW_DRAFT_STORAGE_KEY, label: "Review drafts" },
  { key: "dongle_verification_requests", label: "Verification cache" },
] as const;

async function exportData() {
  const entries = await Promise.all(
    CLEARABLE.map(async ({ key }) => [key, await getStoredItem<unknown>(key)] as const),
  );
  const blob = new Blob([JSON.stringify(Object.fromEntries(entries), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dongle-local-data.json";
  link.click();
  URL.revokeObjectURL(url);
}

export default function StorageSettingsPage() {
  const [estimate, setEstimate] = useState<StorageEstimateResult | null>(null);
  const [status, setStatus] = useState("");

  const refresh = useCallback(() => {
    void getStorageEstimate().then(setEstimate);
  }, []);

  useEffect(refresh, [refresh]);

  const clear = async (key: string, label: string) => {
    await removeStoredItem(key);
    setStatus(`${label} cleared.`);
    refresh();
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 pb-24 pt-28 dark:bg-zinc-950">
      <section
        className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        aria-labelledby="storage-settings-title"
      >
        <h1 id="storage-settings-title" className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Storage
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {estimate
            ? `${formatMegabytes(estimate.usage)} used of ${formatMegabytes(estimate.quota)} available`
            : "Storage usage is not available in this browser."}
        </p>

        <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Clear old data</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Export a copy first if you want to keep it.
          </p>
          <button
            type="button"
            onClick={() => void exportData()}
            className="mt-3 rounded-lg border-2 border-zinc-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-zinc-400 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Export data
          </button>
          <ul className="mt-4 space-y-2">
            {CLEARABLE.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-800 dark:text-zinc-200">{label}</span>
                <button
                  type="button"
                  onClick={() => void clear(key, label)}
                  className="rounded-lg border border-red-500 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Clear
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </section>
    </main>
  );
}
