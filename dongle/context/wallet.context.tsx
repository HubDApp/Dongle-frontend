"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { walletService } from "@/services/wallet/wallet.service";
import { SOROBAN_CONFIG } from "@/constants/contracts";
import { toast } from "sonner";

// ─── Network helpers ────────────────────────────────────────────────────────

/** Human-readable label for a Stellar network passphrase. */
export function getNetworkLabel(passphrase: string | null): string {
  if (!passphrase) return "Unknown";
  if (passphrase.includes("Test SDF Network")) return "Testnet";
  if (passphrase.includes("Public Global Stellar Network")) return "Mainnet";
  if (passphrase.includes("Standalone")) return "Standalone";
  if (passphrase.includes("Futurenet")) return "Futurenet";
  return "Custom";
}

/** The passphrase the app expects — sourced from env / constants. */
export const EXPECTED_NETWORK_PASSPHRASE = SOROBAN_CONFIG.NETWORK_PASSPHRASE;
export const EXPECTED_NETWORK_LABEL = getNetworkLabel(EXPECTED_NETWORK_PASSPHRASE);

// ─── Context shape ──────────────────────────────────────────────────────────

interface WalletContextType {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  /** Passphrase of the network currently active in the wallet, or null when not connected. */
  walletNetwork: string | null;
  /** True when the wallet is connected AND on the expected network. */
  isCorrectNetwork: boolean;
  /** Human-readable label for the wallet's current network (e.g. "Testnet", "Mainnet"). */
  walletNetworkLabel: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = "dongle_wallet_state";

// ─── Provider ───────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [walletNetwork, setWalletNetwork] = useState<string | null>(null);

  const isCorrectNetwork =
    isConnected &&
    walletNetwork !== null &&
    walletNetwork === EXPECTED_NETWORK_PASSPHRASE;

  const walletNetworkLabel = getNetworkLabel(walletNetwork);

  // ── disconnect ─────────────────────────────────────────────────────────────
  const disconnectWallet = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    setWalletNetwork(null);
    localStorage.removeItem(WALLET_STORAGE_KEY);
    toast.success("Wallet disconnected");
  }, []);

  // ── restore on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = localStorage.getItem(WALLET_STORAGE_KEY);
        if (!stored) return;

        const { publicKey: storedKey, isConnected: storedConnected } =
          JSON.parse(stored);
        if (!storedConnected || !storedKey) return;

        const stillConnected = await walletService.isConnected();
        if (!stillConnected) {
          localStorage.removeItem(WALLET_STORAGE_KEY);
          return;
        }

        const [currentKey, networkPassphrase] = await Promise.all([
          walletService.getPublicKey(),
          walletService.getNetworkPassphrase(),
        ]);

        setPublicKey(currentKey);
        setIsConnected(true);
        setWalletNetwork(networkPassphrase);
      } catch (error) {
        console.error("Failed to restore wallet state:", error);
        localStorage.removeItem(WALLET_STORAGE_KEY);
      }
    };
    restore();
  }, []);

  // ── poll for account/network changes while connected ───────────────────────
  useEffect(() => {
    if (!isConnected) return;

    const poll = async () => {
      try {
        const [currentKey, networkPassphrase] = await Promise.all([
          walletService.getPublicKey(),
          walletService.getNetworkPassphrase(),
        ]);

        if (currentKey !== publicKey) {
          console.info("Account change detected:", currentKey);
          setPublicKey(currentKey);
          localStorage.setItem(
            WALLET_STORAGE_KEY,
            JSON.stringify({ publicKey: currentKey, isConnected: true }),
          );
        }

        if (networkPassphrase !== walletNetwork) {
          setWalletNetwork(networkPassphrase);
        }
      } catch (error) {
        console.error("Error polling wallet:", error);
        disconnectWallet();
      }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [isConnected, publicKey, walletNetwork, disconnectWallet]);

  // ── connect ────────────────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (isConnected) return;

    setIsConnecting(true);
    const toastId = toast.loading("Connecting to Freighter...");
    try {
      const [address, networkPassphrase] = await Promise.all([
        walletService.connectWallet(),
        walletService.getNetworkPassphrase(),
      ]);

      setPublicKey(address);
      setIsConnected(true);
      setWalletNetwork(networkPassphrase);
      localStorage.setItem(
        WALLET_STORAGE_KEY,
        JSON.stringify({ publicKey: address, isConnected: true }),
      );

      const onExpectedNetwork =
        networkPassphrase === EXPECTED_NETWORK_PASSPHRASE;

      toast.success(
        onExpectedNetwork
          ? "Wallet connected successfully"
          : `Wallet connected on ${getNetworkLabel(networkPassphrase)} — please switch to ${EXPECTED_NETWORK_LABEL}`,
        { id: toastId },
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Wallet connection failed";
      console.error("Wallet connection failed:", error);
      toast.error(msg, { id: toastId });
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected]);

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        isConnected,
        isConnecting,
        walletNetwork,
        isCorrectNetwork,
        walletNetworkLabel,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
