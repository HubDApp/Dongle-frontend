"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { WatchWalletChanges } from "@stellar/freighter-api";
import { walletService } from "@/services/wallet/wallet.service";
import {
  WalletType,
  WALLET_META,
  connectWithWallet,
  getWalletNetwork,
  signWithWallet,
} from "@/services/wallet/wallet-adapters";
import { redactWalletAddress } from "@/utils/stellar-address.util";
import { logger } from "@/utils/logger.util";
import { SOROBAN_CONFIG } from "@/constants/contracts";
import { WALLET_POLL_INTERVAL_MS } from "@/constants/timeouts";
import { toast } from "sonner";
import {
  trackWalletConnect,
  trackWalletDisconnect,
} from "@/lib/analytics";

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

// ─── Multi-account ──────────────────────────────────────────────────────────

export interface WalletAccount {
  publicKey: string;
  walletType: WalletType;
  label: string;
}

export const MAX_WALLETS = 5;
const ACCOUNTS_STORAGE_KEY = "dongle_wallet_accounts";
const WALLET_TYPE_PREF_KEY = "dongle_wallet_type";

/** Namespace a localStorage key by wallet so bookmarks/drafts stay per-wallet. */
export function walletScopedKey(key: string, publicKey: string | null): string {
  return publicKey ? `${key}:${publicKey}` : key;
}

function readAccounts(): WalletAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WalletAccount[]).slice(0, MAX_WALLETS) : [];
  } catch {
    return [];
  }
}

// ─── Context shape ──────────────────────────────────────────────────────────

interface WalletContextType {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  /** null while checking, false when Freighter is not installed. */
  isFreighterAvailable: boolean | null;
  /** Passphrase of the network currently active in the wallet, or null when not connected. */
  walletNetwork: string | null;
  /** True when the wallet is connected AND on the expected network. */
  isCorrectNetwork: boolean;
  /** Human-readable label for the wallet's current network (e.g. "Testnet", "Mainnet"). */
  walletNetworkLabel: string;
  /** Wallet type of the active account. */
  walletType: WalletType;
  /** Last wallet type the user picked (persisted preference). */
  preferredWalletType: WalletType;
  /** All wallets added this session (max 5). */
  accounts: WalletAccount[];
  connectWallet: (type?: WalletType) => Promise<void>;
  /** Connect an additional wallet without dropping the current ones. */
  addWallet: (type?: WalletType) => Promise<void>;
  switchAccount: (publicKey: string) => void;
  removeAccount: (publicKey: string) => void;
  renameAccount: (publicKey: string, label: string) => void;
  /** Re-read the wallet's network; resolves true when it now matches. */
  recheckNetwork: () => Promise<boolean>;
  signTransaction: (xdr: string, networkPassphrase?: string) => Promise<string>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_STORAGE_KEY = "dongle_wallet_state";

// ─── Provider ───────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isFreighterAvailable, setIsFreighterAvailable] = useState<boolean | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [preferredWalletType, setPreferredWalletType] =
    useState<WalletType>("freighter");

  const walletType: WalletType =
    accounts.find((a) => a.publicKey === publicKey)?.walletType ??
    preferredWalletType;

  const persistAccounts = useCallback((next: WalletAccount[]) => {
    setAccounts(next);
    try {
      if (next.length) localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

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
    setAccounts([]);
    localStorage.removeItem(WALLET_STORAGE_KEY);
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    trackWalletDisconnect();
    toast.success("Wallet disconnected");
  }, []);

  // ── detect Freighter on mount ──────────────────────────────────────────────
  useEffect(() => {
    void walletService.isFreighterAvailable().then(setIsFreighterAvailable);
    try {
      const pref = localStorage.getItem(WALLET_TYPE_PREF_KEY) as WalletType | null;
      if (pref && pref in WALLET_META) setPreferredWalletType(pref);
    } catch {
      /* ignore */
    }
  }, []);

  // ── restore on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = localStorage.getItem(WALLET_STORAGE_KEY);
        if (!stored) return;

        const {
          publicKey: storedKey,
          isConnected: storedConnected,
          walletType: storedType = "freighter",
        } = JSON.parse(stored);
        if (!storedConnected || !storedKey) return;

        const storedAccounts = readAccounts();
        setAccounts(storedAccounts);

        // Ledger/Albedo have no silent session check — trust the stored key.
        if (storedType !== "freighter") {
          setPublicKey(storedKey);
          setIsConnected(true);
          setWalletNetwork(await getWalletNetwork(storedType));
          return;
        }

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
        logger.error("Failed to restore wallet state:", error);
        localStorage.removeItem(WALLET_STORAGE_KEY);
      }
    };
    restore();
  }, []);

  // ── watch for account/network changes while connected ───────────────────────
  useEffect(() => {
    if (!isConnected || walletType !== "freighter") return;

    let watcher: WatchWalletChanges | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const applyAddress = (address: string | null | undefined) => {
      if (!address || address === publicKey) return;
      logger.info("Account change detected:", redactWalletAddress(address));
      setPublicKey(address);
      localStorage.setItem(
        WALLET_STORAGE_KEY,
        JSON.stringify({ publicKey: address, isConnected: true }),
      );
    };

    const applyNetwork = (passphrase: string | null | undefined) => {
      if (!passphrase || passphrase === walletNetwork) return;
      setWalletNetwork(passphrase);
    };

    // Authoritative read — drives the polling fallback and keeps disconnect
    // handling consistent when the watcher reports an error.
    const reconcile = async () => {
      try {
        const [currentKey, networkPassphrase] = await Promise.all([
          walletService.getPublicKey(),
          walletService.getNetworkPassphrase(),
        ]);
        if (cancelled) return;
        applyAddress(currentKey);
        applyNetwork(networkPassphrase);
      } catch (error) {
        if (cancelled) return;
        logger.error("Error polling wallet:", error);
        disconnectWallet();
      }
    };

    const start = () => {
      if (cancelled || watcher || timer !== null) return;

      // Prefer Freighter's event-based watcher: it only fires on real changes,
      // so idle CPU usage stays close to zero.
      if (typeof WatchWalletChanges !== "undefined") {
        const instance = new WatchWalletChanges(WALLET_POLL_INTERVAL_MS);
        const watchResult = instance.watch(
          ({ address, networkPassphrase, error }) => {
            if (cancelled) return;
            if (error) {
              void reconcile();
              return;
            }
            applyAddress(address);
            applyNetwork(networkPassphrase);
          },
        );
        if (!watchResult.error) {
          watcher = instance;
          return;
        }
      }

      // Fallback for Freighter builds without the watcher API.
      void reconcile();
      timer = setInterval(() => void reconcile(), WALLET_POLL_INTERVAL_MS);
    };

    const stop = () => {
      watcher?.stop();
      watcher = null;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    // Only watch while the tab is visible — pausing in the background saves
    // CPU/battery, and a fresh watcher re-checks immediately on resume so
    // changes are still detected without delay.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stop();
    };
  }, [isConnected, publicKey, walletNetwork, disconnectWallet]);

      setIsConnecting(true);
      const toastId = toast.loading(`Connecting to ${WALLET_META[type].name}...`);
      try {
        const address = await connectWithWallet(type);
        const networkPassphrase = await getWalletNetwork(type);

        const base = adding ? accounts : [];
        const exists = base.some((a) => a.publicKey === address);
        const next = exists
          ? base
          : [
              ...base,
              {
                publicKey: address,
                walletType: type,
                label: `${WALLET_META[type].name} ${base.length + 1}`,
              },
            ];
        persistAccounts(next);

        setPublicKey(address);
        setIsConnected(true);
        setWalletNetwork(networkPassphrase);
        setPreferredWalletType(type);
        localStorage.setItem(WALLET_TYPE_PREF_KEY, type);
        localStorage.setItem(
          WALLET_STORAGE_KEY,
          JSON.stringify({ publicKey: address, isConnected: true, walletType: type }),
        );

        const onExpectedNetwork =
          networkPassphrase === EXPECTED_NETWORK_PASSPHRASE;

        trackWalletConnect({
          success: true,
          networkLabel: getNetworkLabel(networkPassphrase),
          walletAddress: address,
        });

        toast.success(
          onExpectedNetwork
            ? exists
              ? "Wallet already added — switched to it"
              : "Wallet connected successfully"
            : `Wallet connected on ${getNetworkLabel(networkPassphrase)} — please switch to ${EXPECTED_NETWORK_LABEL}`,
          { id: toastId },
        );
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Wallet connection failed";
        logger.error("Wallet connection failed:", error);
        trackWalletConnect({
          success: false,
          errorCode: error instanceof Error ? error.name || "Error" : "unknown",
        });
        toast.error(msg, { id: toastId });
      } finally {
        setIsConnecting(false);
      }
    },
    [accounts, persistAccounts],
  );

  const connectWallet = useCallback(
    async (type?: WalletType) => {
      if (isConnected) return;
      // Guard against being used directly as an onClick handler (receives an event).
      const t = typeof type === "string" && type in WALLET_META ? type : preferredWalletType;
      await doConnect(t, false);
    },
    [isConnected, doConnect, preferredWalletType],
  );

  const addWallet = useCallback(
    (type?: WalletType) =>
      doConnect(typeof type === "string" && type in WALLET_META ? type : preferredWalletType, true),
    [doConnect, preferredWalletType],
  );

  const switchAccount = useCallback(
    (key: string) => {
      const target = accounts.find((a) => a.publicKey === key);
      if (!target || key === publicKey) return;
      setPublicKey(key);
      localStorage.setItem(
        WALLET_STORAGE_KEY,
        JSON.stringify({ publicKey: key, isConnected: true, walletType: target.walletType }),
      );
      void getWalletNetwork(target.walletType).then(setWalletNetwork);
      toast.success(`Switched to ${target.label}`);
    },
    [accounts, publicKey],
  );

  const removeAccount = useCallback(
    (key: string) => {
      const next = accounts.filter((a) => a.publicKey !== key);
      if (next.length === 0) {
        disconnectWallet();
        return;
      }
      persistAccounts(next);
      if (key === publicKey) switchAccount(next[0].publicKey);
    },
    [accounts, publicKey, persistAccounts, disconnectWallet, switchAccount],
  );

  const renameAccount = useCallback(
    (key: string, label: string) => {
      persistAccounts(
        accounts.map((a) => (a.publicKey === key ? { ...a, label: label.trim() || a.label } : a)),
      );
    },
    [accounts, persistAccounts],
  );

  const recheckNetwork = useCallback(async () => {
    const passphrase = await getWalletNetwork(walletType);
    setWalletNetwork(passphrase);
    return passphrase === EXPECTED_NETWORK_PASSPHRASE;
  }, [walletType]);

  const signTransaction = useCallback(
    (xdr: string, networkPassphrase = EXPECTED_NETWORK_PASSPHRASE) =>
      signWithWallet(walletType, xdr, networkPassphrase),
    [walletType],
  );

  return (
    <WalletContext.Provider
      value={{
        publicKey,
        isConnected,
        isConnecting,
        isFreighterAvailable,
        walletNetwork,
        isCorrectNetwork,
        walletNetworkLabel,
        walletType,
        preferredWalletType,
        accounts,
        connectWallet,
        addWallet,
        switchAccount,
        removeAccount,
        renameAccount,
        recheckNetwork,
        signTransaction,
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
