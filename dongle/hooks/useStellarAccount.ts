"use client";

import { useState, useEffect, useCallback } from "react";
import { stellarService } from "@/services/stellar/stellar.service";
import { useWallet } from "@/context/wallet.context";
import type { Horizon } from "stellar-sdk";

interface UseStellarAccountReturn {
  account: Horizon.AccountResponse | null;
  balances: Horizon.HorizonApi.BalanceLine[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage Stellar account data.
 * Automatically fetches account information when a wallet is connected.
 * 
 * @returns Account data, balances, loading state, error state, and refetch function
 */
export function useStellarAccount(): UseStellarAccountReturn {
  const { publicKey, isConnected } = useWallet();
  const [account, setAccount] = useState<Horizon.AccountResponse | null>(null);
  const [balances, setBalances] = useState<Horizon.HorizonApi.BalanceLine[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch account data";
      setError(errorMessage);
      setAccount(null);
      setBalances(null);
      console.error("[useStellarAccount] Error fetching account data:", err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, isConnected]);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  return {
    account,
    balances,
    loading,
    error,
    refetch: fetchAccountData,
  };
}
