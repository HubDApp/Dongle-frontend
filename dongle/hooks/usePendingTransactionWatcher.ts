"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useWallet } from "@/context/wallet.context";
import { track } from "@/lib/analytics/client";
import { emitNotificationEvent } from "@/lib/notifications/emit";
import { getHorizonUrl, stellarExpertTxUrl } from "@/lib/stellar-explorer";
import {
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  getPendingTransactions,
  isTxSoundEnabled,
  onPendingTransactionsChange,
  removePendingTransaction,
  saveTxNotification,
  type PendingTransaction,
} from "@/lib/pending-transactions";

type TxStatus = "pending" | "confirmed" | "failed";

async function fetchTxStatus(hash: string): Promise<TxStatus> {
  const res = await fetch(`${getHorizonUrl()}/transactions/${hash}`);
  if (res.status === 404) return "pending";
  if (!res.ok) throw new Error(`Horizon responded ${res.status}`);
  const body = (await res.json()) as { successful?: boolean };
  return body.successful === false ? "failed" : "confirmed";
}

function playChime(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* audio unavailable */
  }
}

function showDesktopNotification(title: string, body: string, url: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const n = new Notification(title, { body, tag: url });
  n.onclick = () => window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Polls pending transactions every 10s and notifies (toast, desktop, sound,
 * SSE event, persisted history) when they complete. Gives up after 5 minutes.
 */
export function usePendingTransactionWatcher(): void {
  const { publicKey } = useWallet();

  useEffect(() => {
    let cancelled = false;

    const finish = (tx: PendingTransaction, status: "confirmed" | "failed" | "timeout") => {
      removePendingTransaction(tx.hash);
      saveTxNotification({ hash: tx.hash, status, label: tx.label, at: new Date().toISOString() });
      const url = stellarExpertTxUrl(tx.hash);
      const short = `${tx.hash.slice(0, 8)}…`;
      const action = { label: "View on StellarExpert", onClick: () => window.open(url, "_blank", "noopener,noreferrer") };

      if (status === "timeout") {
        toast.warning(`Stopped tracking transaction ${short}`, { description: "Still pending after 5 minutes.", action });
        return;
      }

      const title = status === "confirmed" ? "Transaction confirmed" : "Transaction failed";
      (status === "confirmed" ? toast.success : toast.error)(title, { description: tx.label ?? short, action });
      showDesktopNotification(title, tx.label ?? short, url);
      if (isTxSoundEnabled()) playChime();
      track("pending_transaction_confirmed", { status });

      if (publicKey) {
        void emitNotificationEvent({
          type: "transaction_confirmed",
          recipientId: publicKey,
          messageKey: "transaction_confirmed",
          messageParams: { hash: tx.hash, status, url, title },
        });
      }
    };

    const poll = async () => {
      for (const tx of getPendingTransactions()) {
        if (cancelled) return;
        if (Date.now() - tx.submittedAt > POLL_TIMEOUT_MS) {
          finish(tx, "timeout");
          continue;
        }
        try {
          const status = await fetchTxStatus(tx.hash);
          if (status !== "pending") finish(tx, status);
        } catch {
          /* transient error — retry next tick */
        }
      }
    };

    void poll();
    const id = window.setInterval(poll, POLL_INTERVAL_MS);
    const unsubscribe = onPendingTransactionsChange(() => void poll());
    return () => {
      cancelled = true;
      window.clearInterval(id);
      unsubscribe();
    };
  }, [publicKey]);
}

export default usePendingTransactionWatcher;
