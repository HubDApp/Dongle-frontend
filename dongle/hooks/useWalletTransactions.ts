"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@/context/wallet.context";

export interface WalletTransaction {
  id: string;
  hash: string;
  createdAt: string;
  type: string;
  sourceAccount: string;
  status: "success" | "failed";
  memo: string;
  amount: string;
}

interface UseWalletTransactionsReturn {
  transactions: WalletTransaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function mapHorizonTransaction(record: {
  id: string;
  hash?: string;
  created_at: string;
  type?: string;
  source_account?: string;
  successful?: boolean;
  memo?: string;
  fee_charged?: string | number;
}): WalletTransaction {
  return {
    id: record.id,
    hash: record.hash ?? record.id,
    createdAt: record.created_at,
    type: record.type ?? "unknown",
    sourceAccount: record.source_account ?? "",
    status: record.successful === false ? "failed" : "success",
    memo: record.memo ?? "",
    // Horizon transaction records carry the fee charged (stroops), not payment amounts.
    amount: record.fee_charged != null ? String(record.fee_charged) : "",
  };
}

export function useWalletTransactions(limit = 10): UseWalletTransactionsReturn {
  const { publicKey, isConnected } = useWallet();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!publicKey || !isConnected) {
      if (isMountedRef.current) {
        setTransactions([]);
        setError(null);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { stellarService } = await import(
        /* webpackChunkName: "stellar-service" */ "@/services/stellar/stellar.service"
      );
      const records = await stellarService.getTransactions(publicKey, limit);
      if (!isMountedRef.current) return;
      setTransactions(records.map(mapHorizonTransaction));
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg =
        err instanceof Error ? err.message : "Failed to fetch wallet activity";
      setError(msg);
      setTransactions([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [publicKey, isConnected, limit]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, loading, error, refetch: fetchTransactions };
}
