"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWallet } from "@/context/wallet.context";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";

export interface AuthUser {
  id: string;
  provider: "google" | "github" | "wallet";
  email?: string;
  name?: string;
  avatarUrl?: string;
  walletAddress?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isOAuth: boolean;
  isReadOnly: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  startOAuth: (provider: "google" | "github") => void;
  requireWallet: () => boolean;
  linkWalletIfNeeded: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { publicKey, isConnected } = useWallet();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const body = (await res.json()) as { user: AuthUser | null };
      setUser(body.user);
    } catch (error) {
      console.error("[auth] session restore failed", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const error = searchParams.get("oauth_error");
    if (!error) return;
    if (error === "denied") toast.error(t("auth.oauthDenied"));
    else if (error === "invalid_state") toast.error(t("auth.oauthInvalidState"));
    else if (error === "missing_profile") toast.error(t("auth.missingProfile"));
    else toast.error(t("auth.oauthError"));
  }, [searchParams, t]);

  const linkWalletIfNeeded = useCallback(async () => {
    if (!user || !publicKey) return;
    if (user.walletAddress === publicKey) return;
    try {
      await fetch("/api/auth/link-wallet", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey }),
      });
      await refresh();
    } catch (error) {
      console.error("[auth] wallet link failed", error);
    }
  }, [publicKey, refresh, user]);

  useEffect(() => {
    void linkWalletIfNeeded();
  }, [linkWalletIfNeeded]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const startOAuth = useCallback((provider: "google" | "github") => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/api/auth/oauth/${provider}?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  const isOAuth = Boolean(user && user.provider !== "wallet");
  const isReadOnly = isOAuth && !isConnected;

  const requireWallet = useCallback(() => {
    if (isConnected && publicKey) return true;
    return false;
  }, [isConnected, publicKey]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isOAuth,
      isReadOnly,
      signOut,
      refresh,
      startOAuth,
      requireWallet,
      linkWalletIfNeeded,
    }),
    [user, loading, isOAuth, isReadOnly, signOut, refresh, startOAuth, requireWallet, linkWalletIfNeeded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </Suspense>
  );
}

const AUTH_FALLBACK: AuthContextValue = {
  user: null,
  loading: false,
  isOAuth: false,
  isReadOnly: false,
  signOut: async () => {},
  refresh: async () => {},
  startOAuth: () => {},
  requireWallet: () => false,
  linkWalletIfNeeded: async () => {},
};

export function useAuth(): AuthContextValue {
  return useContext(AuthContext) ?? AUTH_FALLBACK;
}
