"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { walletService } from "@/services/wallet/wallet.service";

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

  const connectWallet = useCallback(async () => {
    if (isConnected) return;
    
    setIsConnecting(true);
    try {
      const address = await walletService.connectWallet();
      setPublicKey(address);
      setIsConnected(true);
      
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({
        publicKey: address,
        isConnected: true
      }));
    } catch (error) {
      console.error("Wallet connection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected]);

  const disconnectWallet = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    localStorage.removeItem(WALLET_STORAGE_KEY);
  }, []);

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
