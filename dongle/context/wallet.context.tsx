"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

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

  // Initialize from local storage to persist connection state across sessions
  useEffect(() => {
    try {
      const storedState = localStorage.getItem(WALLET_STORAGE_KEY);
      if (storedState) {
        const { publicKey: storedKey, isConnected: storedConnected } = JSON.parse(storedState);
        if (storedConnected && storedKey) {
          setPublicKey(storedKey);
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error("Failed to restore wallet state:", error);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (isConnected) return;
    
    setIsConnecting(true);
    try {
      // Placeholder logic for connecting wallet. 
      // To be replaced with actual provider integration (e.g. Solana Wallet Adapter) in Task #3
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate connection delay
      
      const mockPublicKey = "E9G8...ProfessionalPublicKey...2kP1"; // Mocked base58-like public key
      setPublicKey(mockPublicKey);
      setIsConnected(true);
      
      // Persist state
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify({
        publicKey: mockPublicKey,
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
