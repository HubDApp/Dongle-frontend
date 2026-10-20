"use client";

import { useState, useCallback, useEffect } from "react";
import { Transaction } from "stellar-sdk";
import {
  connect,
  disconnect,
  getSession,
  getStoredSession,
  setStoredSession,
  validateStellarNetwork,
  signTransaction,
  type WalletSession,
  type WalletProvider,
} from "@/services/wallet/wallet-connect.service";

export interface UseWalletConnectResult {
  session: WalletSession | null;
  connecting: boolean;
  error: string | null;
  networkValid: boolean;
  connect: (provider?: WalletProvider) => Promise<void>;
  disconnect: () => void;
  signTransaction: (txXdr: string) => Promise<{ signed: boolean; xdr?: string; error?: string }>;
}

/**
 * Hook for wallet connection supporting Freighter and Wallet Connect v2
 * (issue #723). Provides session persistence and Stellar network validation.
 */
export function useWalletConnect(): UseWalletConnectResult {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredSession();
    setSession(stored);
  }, []);

  const networkValid = session ? validateStellarNetwork(session).valid : false;

  const doConnect = useCallback(
    async (provider?: WalletProvider) => {
      setConnecting(true);
      setError(null);
      try {
        const result = await connect(provider ?? "walletconnect");
        if (result.error) {
          setError(result.error);
          setSession(null);
          return;
        }
        setSession(result.session);
        if (result.session) setStoredSession(result.session);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      } finally {
        setConnecting(false);
      }
    },
    [],
  );

  const doDisconnect = useCallback(() => {
    disconnect();
    setSession(null);
    setStoredSession(null);
    setError(null);
  }, []);

  const doSignTransaction = useCallback(
    async (txXdr: string) => {
      const s = getSession();
      if (!s) return { signed: false, error: "No wallet connected" };
      // Build a minimal stellar-sdk Transaction from XDR for signing.
      let tx: any;
      try {
        tx = new Transaction(txXdr);
      } catch {
        return { signed: false, error: "Invalid transaction XDR" };
      }
      return signTransaction(tx);
    },
    [],
  );

  return { session, connecting, error, networkValid, connect: doConnect, disconnect: doDisconnect, signTransaction: doSignTransaction };
}

export type { WalletSession, WalletProvider };
