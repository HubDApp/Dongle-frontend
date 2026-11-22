"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Unlink } from "lucide-react";
import { track } from "@/lib/analytics/client";
import type { SessionPayload } from "@/lib/auth/session";

const AUTO_SYNC_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_SYNC_KEY = "dongle_profile_last_synced";

function timeAgo(iso: string | null, now: number): string {
  if (!iso) return "never";
  const mins = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function AccountSettingsPanel() {
  const [user, setUser] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const saveLastSynced = (iso: string) => {
    setLastSynced(iso);
    try {
      localStorage.setItem(LAST_SYNC_KEY, iso);
    } catch {
      /* ignore */
    }
  };

  const syncProfile = useCallback(async (source: "manual" | "auto") => {
    setSyncing(true);
    setSyncError(null);
    if (source === "manual") track("profile_sync", { source });
    try {
      const res = await fetch("/api/auth/refresh-profile", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Profile sync failed");
      setUser((prev) => ({ ...(prev as SessionPayload), ...data.user }));
      saveLastSynced(data.user.lastSyncedAt ?? new Date().toISOString());
      if (source === "manual") toast.success("Profile refreshed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Profile sync failed";
      setSyncError(message);
      if (source === "manual") toast.error(message);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      /* ignore */
    }
    setLastSynced(stored);
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const u: (SessionPayload & { lastSyncedAt?: string }) | null = data?.user ?? null;
        setUser(u);
        if (u?.lastSyncedAt) stored = u.lastSyncedAt;
        setLastSynced(stored);
        if (u && u.provider !== "wallet") {
          const last = stored ? new Date(stored).getTime() : 0;
          if (Date.now() - last > AUTO_SYNC_MS) void syncProfile("auto");
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [syncProfile]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const unlink = async () => {
    setConfirmUnlink(false);
    const previous = user;
    setUser((prev) => (prev ? { ...prev, walletAddress: undefined } : prev)); // optimistic
    try {
      const res = await fetch("/api/auth/unlink-wallet", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to unlink wallet");
      toast.success("Wallet unlinked");
    } catch (err) {
      setUser(previous);
      toast.error(err instanceof Error ? err.message : "Failed to unlink wallet");
    }
  };

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin text-zinc-400" aria-label="Loading" />;
  }
  if (!user) {
    return <p className="text-sm text-zinc-500">Sign in with Google or GitHub to manage your account.</p>;
  }

  const card = "rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6";
  const btn =
    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50";

  return (
    <div className="space-y-6">
      <section className={card} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          {user.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-full" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.name ?? "—"}</p>
            <p className="text-sm text-zinc-500 truncate">{user.email ?? "—"}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => syncProfile("manual")}
            disabled={syncing || user.provider === "wallet"}
            className={`${btn} bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700`}
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh profile
          </button>
          <span className="text-xs text-zinc-500" aria-live="polite">
            Last synced: {timeAgo(lastSynced, now)}
          </span>
        </div>
        {syncError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {syncError}
          </p>
        )}
      </section>

      <section className={card} aria-labelledby="wallet-heading">
        <h2 id="wallet-heading" className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Linked wallet</h2>
        {user.walletAddress ? (
          <>
            <p className="font-mono text-sm break-all text-zinc-600 dark:text-zinc-300">{user.walletAddress}</p>
            {confirmUnlink ? (
              <div role="alertdialog" aria-labelledby="unlink-confirm" className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 p-4">
                <p id="unlink-confirm" className="text-sm text-red-700 dark:text-red-300">
                  Unlink this wallet? You can re-link the same or a different wallet later.
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={unlink} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>
                    Unlink
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmUnlink(false)}
                    className={`${btn} bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmUnlink(true)}
                className={`${btn} mt-4 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40`}
              >
                <Unlink className="w-4 h-4" /> Unlink wallet
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-500">No wallet linked. Connect Freighter to link one.</p>
        )}
      </section>
    </div>
  );
}
