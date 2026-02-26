"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { walletService } from "@/services/wallet/wallet.service";
import { sessionService } from "@/services/auth/session.service";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<string>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: true,
    error: null,
  });

  useEffect(() => {
    async function checkConnection() {
      try {
        const connected = await walletService.isConnected();
        if (connected) {
          const address = await walletService.getPublicKey();
          setState({
            address,
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        } else {
          setState({
            address: null,
            isConnected: false,
            isConnecting: false,
            error: null,
          });
        }
      } catch (err: any) {
        setState({
          address: null,
          isConnected: false,
          isConnecting: false,
          error: err.message,
        });
      }
    }
    checkConnection();
  }, []);

  const connect = useCallback(async (): Promise<string> => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const address = await walletService.connectWallet();
      sessionService.createSession(address);
      setState({
        address,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
      return address;
    } catch (err: any) {
      setState({
        address: null,
        isConnected: false,
        isConnecting: false,
        error: err.message,
      });
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    walletService.disconnectWallet();
    sessionService.clearSession();
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  const value = useMemo(
    () => ({ ...state, connect, disconnect }),
    [state, connect, disconnect]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
