"use client";

/**
 * useAdminSession
 *
 * Manages the admin JWT session lifecycle:
 * - Requests a JWT after wallet connects and public key is in the allowlist
 * - Stores the token in memory (never localStorage)
 * - Auto-refreshes before expiry
 * - Logs admin access with timestamp
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";

const VERIFY_INTERVAL_MS = 60_000;
const REFRESH_API = "/api/admin/refresh";
const VERIFY_API = "/api/admin/verify";
const AUTH_API = "/api/admin/auth";

export interface AdminSessionResult {
  isAdmin: boolean;
  isAdminChecking: boolean;
  authenticate: (publicKey: string) => Promise<void>;
  logout: () => Promise<void>;
  expiresInSeconds: number | null;
}

export function useAdminSession(): AdminSessionResult {
  const { isAdmin: isWalletAdmin, isAdminChecking: isWalletChecking, gate } = useAdminAccess();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminChecking, setIsAdminChecking] = useState(true);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const verify = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(VERIFY_API);
      if (!res.ok) {
        setIsAdmin(false);
        setExpiresInSeconds(null);
        return false;
      }
      const data = await res.json();
      setIsAdmin(data.valid === true);
      setExpiresInSeconds(data.remainingSeconds ?? null);

      if (data.valid && data.shouldRefresh) {
        const refreshRes = await fetch(REFRESH_API, { method: "POST" });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setExpiresInSeconds(refreshData.expiresInSeconds ?? null);
        }
      }

      return data.valid === true;
    } catch {
      setIsAdmin(false);
      setExpiresInSeconds(null);
      return false;
    }
  }, []);

  const authenticate = useCallback(
    async (publicKey: string) => {
      setIsAdminChecking(true);
      try {
        const res = await fetch(AUTH_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicKey }),
        });

        if (res.ok) {
          console.log(
            `[admin-access] Session started for ${publicKey.slice(0, 8)}...${publicKey.slice(-4)} at ${new Date().toISOString()}`,
          );
          await verify();
        } else {
          setIsAdmin(false);
          setExpiresInSeconds(null);
        }
      } catch {
        setIsAdmin(false);
        setExpiresInSeconds(null);
      } finally {
        setIsAdminChecking(false);
      }
    },
    [verify],
  );

  const logout = useCallback(async () => {
    clearPolling();
    try {
      await fetch(REFRESH_API, { method: "POST" });
    } catch {
      // Ignore
    }
    setIsAdmin(false);
    setExpiresInSeconds(null);
    console.log(`[admin-access] Session ended at ${new Date().toISOString()}`);
  }, [clearPolling]);

  // When wallet admin status changes, manage the session
  useEffect(() => {
    if (isWalletChecking) {
      setIsAdminChecking(true);
      return;
    }

    if (!isWalletAdmin || !gate.publicKey) {
      clearPolling();
      setIsAdmin(false);
      setIsAdminChecking(false);
      setExpiresInSeconds(null);
      return;
    }

    // Auto-authenticate with the connected wallet's public key
    setIsAdminChecking(true);
    authenticate(gate.publicKey).finally(() => setIsAdminChecking(false));

    clearPolling();
    intervalRef.current = setInterval(() => {
      verify();
    }, VERIFY_INTERVAL_MS);

    return () => clearPolling();
  }, [isWalletAdmin, isWalletChecking, gate.publicKey, authenticate, verify, clearPolling]);

  return { isAdmin, isAdminChecking, authenticate, logout, expiresInSeconds };
}
