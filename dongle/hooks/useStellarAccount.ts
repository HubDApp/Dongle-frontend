"use client";

import { useState, useEffect, useCallback } from "react";
import { stellarService } from "@/services/stellar/stellar.service";
import { useWallet } from "@/context/wallet.context";
import type { Horizon } from "stellar-sdk";
import { toast } from "sonner";

interface UseStellarAccountReturn {
  account: Horizon.AccountResponse | null;
  balances: Horizon.HorizonApi.BalanceLine[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStellarAccount(): UseStellarAccountReturn {
  const { publicKey, isConnected } = useWallet();
  const [account, setAccount] = useState<Horizon.AccountResponse | null>(null);
  const [balances, setBalances] = useState<Horizon.HorizonApi.BalanceLine[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Shared fetch logic — used both by the effect and the manual refetch
  const fetchAccountData = useCallback(async () => {
    if (!publicKey || !isConnected) {
      setAccount(null);
      setBalances(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const accountData = await stellarService.getAccount(publicKey);
      setAccount(accountData);
      setBalances(accountData.balances);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch account data";
      setError(msg);
      setAccount(null);
      setBalances(null);
      console.error("[useStellarAccount]", err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [publicKey, isConnected]);

  useEffect(() => {
    // Async IIFE keeps the effect synchronous at the top level,
    // satisfying the react-hooks/set-state-in-effect rule while
    // still running the async fetch on dependency changes.
    void (async () => { await fetchAccountData(); })();
  }, [fetchAccountData]);

  return { account, balances, loading, error, refetch: fetchAccountData };
}
