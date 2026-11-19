"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { migrateLocalStorageToIndexedDB } from "@/lib/indexed-storage";
import { formatMegabytes, getStorageEstimate } from "@/lib/storage-quota";
import { REVIEW_DRAFT_STORAGE_KEY } from "@/hooks/useReviewDraft";
import { track } from "@/lib/analytics/client";

/** Runs once on app start: migrates large data to IndexedDB and warns near the storage quota. */
export function StorageBootstrap() {
  useEffect(() => {
    void migrateLocalStorageToIndexedDB([REVIEW_DRAFT_STORAGE_KEY]);

    void getStorageEstimate().then((estimate) => {
      if (!estimate?.nearLimit) return;
      track("storage_quota_warning", { usagePercent: Math.round(estimate.ratio * 100) });
      toast.warning(
        `Storage almost full: ${formatMegabytes(estimate.usage)} of ${formatMegabytes(estimate.quota)} used.`,
        { action: { label: "Manage", onClick: () => window.location.assign("/settings/storage") } },
      );
    });
  }, []);

  return null;
}
