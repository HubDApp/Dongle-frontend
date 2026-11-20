"use client";

import { usePendingTransactionWatcher } from "@/hooks/usePendingTransactionWatcher";

/** Mount once near the root to watch pending transactions app-wide. */
export function PendingTransactionWatcher() {
  usePendingTransactionWatcher();
  return null;
}

export default PendingTransactionWatcher;
