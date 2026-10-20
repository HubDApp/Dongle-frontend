"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/context/wallet.context";
import {
  getComparisonHistory,
  deleteComparisonHistoryEntry,
  buildComparisonPermalink,
  type ComparisonHistoryEntry,
} from "@/utils/comparison-history.util";
import { toast } from "sonner";
import { CalendarDays, Trash2, Copy, FolderOpen } from "lucide-react";

export default function ComparisonHistoryPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [history, setHistory] = useState<ComparisonHistoryEntry[]>([]);

  const refreshHistory = () => {
    setHistory(getComparisonHistory(publicKey ?? null));
  };

  useEffect(() => {
    refreshHistory();
  }, [publicKey]);

  const handleLoad = (entry: ComparisonHistoryEntry) => {
    router.push(`/compare?ids=${entry.projectIds.join(",")}`);
  };

  const handleDelete = (entryId: string) => {
    deleteComparisonHistoryEntry(entryId, publicKey ?? null);
    refreshHistory();
    toast.success("Comparison removed from history");
  };

  const handleCopyLink = async (entry: ComparisonHistoryEntry) => {
    const link = buildComparisonPermalink(entry.projectIds);
    await navigator.clipboard.writeText(link);
    toast.success("Comparison permalink copied");
  };

  if (history.length === 0) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-3xl font-bold">Comparison History</h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">
            No saved comparisons yet. Save a comparison from the compare screen to revisit it later.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => router.push("/compare")}>
              Open Compare
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">Saved comparisons</p>
            <h1 className="mt-2 text-3xl font-bold">Comparison History</h1>
          </div>
          <Button variant="outline" onClick={() => router.push("/compare")}>
            Back to Compare
          </Button>
        </div>

        <div className="space-y-4">
          {history.map((entry) => (
            <div key={entry.id} className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.summary.map((project) => (
                      <span key={project.id} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium dark:bg-zinc-800">
                        {project.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => handleLoad(entry)}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Load comparison
                  </Button>
                  <Button variant="outline" onClick={() => handleCopyLink(entry)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy link
                  </Button>
                  <Button variant="error" onClick={() => handleDelete(entry.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {entry.summary.map((project) => (
                  <div key={project.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{project.name}</div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{project.category}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-300">
                      <span>Rating: {project.rating}</span>
                      <span>{project.reviews} reviews</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
