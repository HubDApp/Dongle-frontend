"use client";

/**
 * Admin session expiry countdown (#868).
 *
 * Expiry comes from the server (`remainingSeconds` from /api/admin/verify) and is
 * tracked against the monotonic `performance.now()` clock, so a wrong client
 * wall-clock cannot extend or shorten the session.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, RefreshCw } from "lucide-react";

const AUTO_REFRESH_AT_S = 5 * 60;
const WARN_AT_S = 60;
const RESYNC_MS = 60_000;

export function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function AdminSessionTimer() {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const deadlineRef = useRef<number | null>(null); // performance.now() ms
  const warnedRef = useRef(false);
  const autoTriedRef = useRef(false);
  const refreshingRef = useRef(false);

  const applyServerRemaining = (seconds: number) => {
    deadlineRef.current = performance.now() + seconds * 1000;
    setRemaining(seconds);
  };

  const verify = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/verify", { cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.valid || typeof data.remainingSeconds !== "number") return false;
      applyServerRemaining(data.remainingSeconds);
      return true;
    } catch {
      return false;
    }
  }, []);

  const forceReauth = useCallback(() => {
    deadlineRef.current = null;
    setRemaining(null);
    toast.error("Session expired. Please sign in again.");
    router.push("/admin");
    router.refresh();
  }, [router]);

  const refresh = useCallback(
    async (manual: boolean) => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      try {
        const res = await fetch("/api/admin/refresh", { method: "POST" });
        if (!res.ok || !(await verify())) {
          forceReauth();
          return;
        }
        warnedRef.current = false;
        autoTriedRef.current = false;
        toast.success("Session refreshed");
      } catch {
        if (manual) toast.error("Could not refresh session");
        else forceReauth();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    },
    [verify, forceReauth],
  );

  useEffect(() => {
    void verify();
    const resync = setInterval(() => void verify(), RESYNC_MS);
    const tick = setInterval(() => {
      if (deadlineRef.current == null) return;
      const left = (deadlineRef.current - performance.now()) / 1000;
      setRemaining(left);
      if (left <= 0) {
        forceReauth();
        return;
      }
      if (left <= AUTO_REFRESH_AT_S && !autoTriedRef.current) {
        autoTriedRef.current = true;
        void refresh(false);
      }
      if (left <= WARN_AT_S && !warnedRef.current) {
        warnedRef.current = true;
        toast.warning("Your admin session expires in 1 minute");
      }
    }, 1000);
    return () => {
      clearInterval(resync);
      clearInterval(tick);
    };
  }, [verify, refresh, forceReauth]);

  if (remaining == null) return null;

  const urgent = remaining <= AUTO_REFRESH_AT_S;
  return (
    <div className="inline-flex items-center gap-2 ml-auto text-sm">
      <span
        role="timer"
        aria-live="off"
        className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl ${
          urgent
            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        }`}
      >
        <Clock className="w-4 h-4" />
        Session expires in {formatRemaining(remaining)}
      </span>
      <button
        type="button"
        onClick={() => refresh(true)}
        disabled={refreshing}
        aria-label="Refresh admin session"
        className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
