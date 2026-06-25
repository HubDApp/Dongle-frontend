"use client";

import { useWallet } from "@/context/wallet.context";
import { useStellarAccount } from "@/hooks/useStellarAccount";
import {
  isAccountNotFundedError,
  type WalletPageState,
} from "@/components/wallet/wallet-states";

export interface UseWalletPageGateOptions {
  /** When true, blocks on unfunded/missing Horizon account. */
  requireFundedAccount?: boolean;
}

export interface WalletPageGateResult {
  state: WalletPageState;
  publicKey: string | null;
  walletNetworkLabel: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
}

/**
 * Resolves the wallet gate state for pages that depend on wallet connectivity.
 * Priority: freighter missing → connecting → disconnected → wrong network →
 * account loading → account not funded → ready.
 */
export function useWalletPageGate(
  options: UseWalletPageGateOptions = {},
): WalletPageGateResult {
  const { requireFundedAccount = false } = options;
  const {
    publicKey,
    isConnected,
    isConnecting,
    isCorrectNetwork,
    walletNetworkLabel,
    isFreighterAvailable,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const { loading: accountLoading, error: accountError } = useStellarAccount();

  if (isFreighterAvailable === false) {
    return {
      state: "freighter-missing",
      publicKey,
      walletNetworkLabel,
      connectWallet,
      disconnectWallet,
      isConnecting,
    };
  }

  if (isConnecting) {
    return {
      state: "connecting",
      publicKey,
      walletNetworkLabel,
      connectWallet,
      disconnectWallet,
      isConnecting,
    };
  }

  if (!isConnected) {
    return {
      state: "disconnected",
      publicKey,
      walletNetworkLabel,
      connectWallet,
      disconnectWallet,
      isConnecting,
    };
  }

  if (!isCorrectNetwork) {
    return {
      state: "wrong-network",
      publicKey,
      walletNetworkLabel,
      connectWallet,
      disconnectWallet,
      isConnecting,
    };
  }

  if (requireFundedAccount) {
    if (accountLoading) {
      return {
        state: "account-loading",
        publicKey,
        walletNetworkLabel,
        connectWallet,
        disconnectWallet,
        isConnecting,
      };
    }

    if (isAccountNotFundedError(accountError)) {
      return {
        state: "account-not-funded",
        publicKey,
        walletNetworkLabel,
        connectWallet,
        disconnectWallet,
        isConnecting,
      };
    }
  }

  return {
    state: "ready",
    publicKey,
    walletNetworkLabel,
    connectWallet,
    disconnectWallet,
    isConnecting,
  };
}
