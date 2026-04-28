"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { walletService } from "@/services/wallet/wallet.service";
import { toast } from "sonner";

interface WalletContextType {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = "dongle_wallet_state";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Declared first so the polling effect below can reference it
  const disconnectWallet = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    localStorage.removeItem(WALLET_STORAGE_KEY);
    toast.success("Wallet disconnected");
  }, []);

  // Restore wallet state on mount
  useEffect(() => {
    const restoreWalletState = async () => {
      try {
        const storedState = localStorage.getItem(WALLET_STORAGE_KEY);
        if (storedState) {
          const { publicKey: storedKey, isConnected: storedConnected } = JSON.parse(storedState);
          if (storedConnected && storedKey) {
            const isStillConnected = await walletService.isConnected();
            if (isStillConnected) {
              const currentKey = await walletService.getPublicKey();
              setPublicKey(currentKey);
              setIsConnected(true);
            } else {
              localStorage.removeItem(WALLET_STORAGE_KEY);
            }
          }
        }
      } catch (error) {
        console.error("Failed to restore wallet state:", error);
        localStorage.removeItem(WALLET_STORAGE_KEY);
      }
    };
    restoreWalletState();
  }, []);

  // Poll for account changes while connected
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(async () => {
      try {
        const currentKey = await walletService.getPublicKey();
        if (currentKey !== publicKey) {
          console.info("Account change detected:", currentKey);
          setPublicKey(currentKey);
          localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({
            publicKey: currentKey,
            isConnected: true,
          }));
        }
      } catch (error) {
        console.error("Error checking account change:", error);
        disconnectWallet();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected, publicKey, disconnectWallet]);

  const connectWallet = useCallback(async () => {
    if (isConnected) return;

    setIsConnecting(true);
    const toastId = toast.loading("Connecting to Freighter...");
    try {
      const address = await walletService.connectWallet();
      setPublicKey(address);
      setIsConnected(true);
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({
        publicKey: address,
        isConnected: true,
      }));
      toast.success("Wallet connected successfully", { id: toastId });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Wallet connection failed";
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
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
