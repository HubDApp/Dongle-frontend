"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface SessionView {
  sessionId: string;
  device: {
    fingerprint: string;
    label: string;
    ipHash: string;
  };
  createdAt: string;
  lastActiveAt: string;
  isCurrent?: boolean;
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SessionsPanel() {
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sessions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sessions");
      const data = (await res.json()) as { sessions: SessionView[] };
      setSessions(data.sessions);
    } catch {
      toast.error("Could not load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revokeOne = useCallback(
    async (sessionId: string) => {
      setRevoking(sessionId);
      try {
        const res = await fetch(`/api/auth/sessions/${sessionId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to revoke");
        toast.success("Session revoked");
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      } catch {
        toast.error("Could not revoke session");
      } finally {
        setRevoking(null);
      }
    },
    [],
  );

  const revokeAll = useCallback(async () => {
    setRevoking("all");
    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to revoke all");
      const data = (await res.json()) as { revoked: number };
      toast.success(`Revoked ${data.revoked} session${data.revoked !== 1 ? "s" : ""}`);
      // Keep only the current session in the list
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch {
      toast.error("Could not revoke sessions");
    } finally {
      setRevoking(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading sessions">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Active sessions ({sessions.length} / 5)
        </h2>
        {otherSessions.length > 0 && (
          <button
            onClick={() => void revokeAll()}
            disabled={revoking === "all"}
            className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
          >
            {revoking === "all" ? "Revoking…" : "Revoke all other sessions"}
          </button>
        )}
      </div>

      <ul className="space-y-3" aria-label="Active sessions list">
        {sessions.map((s) => (
          <li
            key={s.sessionId}
            className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3"
          >
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {s.device.label}
                </span>
                {s.isCurrent && (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                    This device
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Last active {formatRelative(s.lastActiveAt)} · Signed in{" "}
                {formatRelative(s.createdAt)}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 font-mono">
                {s.device.ipHash}
              </p>
            </div>

            {!s.isCurrent && (
              <button
                onClick={() => void revokeOne(s.sessionId)}
                disabled={revoking === s.sessionId}
                aria-label={`Revoke session on ${s.device.label}`}
                className="shrink-0 text-xs text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors mt-0.5"
              >
                {revoking === s.sessionId ? "Revoking…" : "Revoke"}
              </button>
            )}
          </li>
        ))}

        {sessions.length === 0 && (
          <li className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
            No active sessions found.
          </li>
        )}
      </ul>
    </div>
  );
}
