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
  /** True while fetching the next page. */
  loadingMore: boolean;
  error: string | null;
  /** Error from the most recent "load more" attempt. */
  loadMoreError: string | null;
  /** False once Horizon returned a short page — all transactions loaded. */
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

interface CacheEntry {
  transactions: WalletTransaction[];
  hasMore: boolean;
}

/** Per-account cache so loaded pages are not re-fetched on remount. */
const txCache = new Map<string, CacheEntry>();

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

async function fetchPage(publicKey: string, limit: number, cursor?: string) {
  const { stellarService } = await import(
    /* webpackChunkName: "stellar-service" */ "@/services/stellar/stellar.service"
  );
  const records = await stellarService.getTransactions(publicKey, limit, cursor);
  return records.map(mapHorizonTransaction);
}

const errMsg = (err: unknown) =>
  err instanceof Error ? err.message : "Failed to fetch wallet activity";

export function useWalletTransactions(limit = 10): UseWalletTransactionsReturn {
  const { publicKey, isConnected } = useWallet();
  const cacheKey = publicKey ? `${publicKey}:${limit}` : "";
  const cached = cacheKey ? txCache.get(cacheKey) : undefined;

  const [transactions, setTransactions] = useState<WalletTransaction[]>(
    cached?.transactions ?? [],
  );
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const commit = useCallback(
    (txs: WalletTransaction[], more: boolean) => {
      if (cacheKey) txCache.set(cacheKey, { transactions: txs, hasMore: more });
      setTransactions(txs);
      setHasMore(more);
    },
    [cacheKey],
  );

  const fetchTransactions = useCallback(
    async (force = true) => {
      if (!publicKey || !isConnected) {
        if (isMountedRef.current) {
          setTransactions([]);
          setHasMore(false);
          setError(null);
        }
        return;
      }

      const hit = txCache.get(cacheKey);
      if (!force && hit) {
        setTransactions(hit.transactions);
        setHasMore(hit.hasMore);
        return;
      }

      setLoading(true);
      setError(null);
      setLoadMoreError(null);

      try {
        const page = await fetchPage(publicKey, limit);
        if (!isMountedRef.current) return;
        commit(page, page.length === limit);
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(errMsg(err));
        setTransactions([]);
        setHasMore(false);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [publicKey, isConnected, limit, cacheKey, commit],
  );

  const loadMore = useCallback(async () => {
    if (!publicKey || !hasMore || loadingMoreRef.current) return;
    const last = transactions[transactions.length - 1];
    if (!last) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchPage(publicKey, limit, last.pagingToken);
      if (!isMountedRef.current) return;
      const seen = new Set(transactions.map((t) => t.id));
      commit(
        [...transactions, ...page.filter((t) => !seen.has(t.id))],
        page.length === limit,
      );
    } catch (err) {
      if (isMountedRef.current) setLoadMoreError(errMsg(err));
    } finally {
      loadingMoreRef.current = false;
      if (isMountedRef.current) setLoadingMore(false);
    }
  }, [publicKey, hasMore, transactions, limit, commit]);

  useEffect(() => {
    void fetchTransactions(false);
  }, [fetchTransactions]);

  const refetch = useCallback(() => fetchTransactions(true), [fetchTransactions]);

  return {
    transactions,
    loading,
    loadingMore,
    error,
    loadMoreError,
    hasMore,
    refetch,
    loadMore,
  };
}
