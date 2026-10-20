"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

/** Access token TTL is 15 min; refresh 2 min before expiry. */
const REFRESH_BEFORE_MS = 2 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { publicKey, isConnected } = useWallet();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      void silentRefresh();
    }, ACCESS_TOKEN_TTL_MS - REFRESH_BEFORE_MS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const silentRefresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        scheduleRefresh();
      } else {
        // Suspicious activity or expired — force sign-out
        setUser(null);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === "Suspicious activity detected") {
          toast.error("Session terminated due to suspicious activity. Please sign in again.");
        }
      }
    } catch {
      // Network error — try again on next refresh cycle
    }
  }, [scheduleRefresh]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const body = (await res.json()) as { user: AuthUser | null };
      setUser(body.user);
      if (body.user) scheduleRefresh();
    } catch (error) {
      console.error("[auth] session restore failed", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [scheduleRefresh]);

  useEffect(() => {
    void refresh();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
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
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
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
