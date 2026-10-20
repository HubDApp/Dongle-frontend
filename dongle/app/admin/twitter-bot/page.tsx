"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTwitterConfig,
  listOptOuts,
  optOut,
  optIn,
  isOptedOut,
  type TwitterConfig,
} from "@/services/social/twitter-bot.service";

interface ProjectRow {
  id: string;
  name: string;
  tier: string;
  link: string;
  description?: string;
}

/**
 * Admin panel for the Twitter bot (issue #722): configure tweet templates,
 * enable/disable auto-tweeting, manage project opt-outs, and post manual tweets.
 */
export function TwitterBotAdmin() {
  const [config, setConfig] = useState<TwitterConfig | null>(null);
  const [optedOut, setOptedOut] = useState<string[]>([]);
  const [manualText, setManualText] = useState("");
  const [manualProjects, setManualProjects] = useState<ProjectRow[]>([]);
  const [status, setStatus] = useState<{ message: string; kind: "info" | "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/tweet");
      const json = await res.json();
      setConfig(json.data || null);
      const outs = listOptOutsSync();
      setOptedOut(outs.map((o) => o.projectId));
    } catch {
      setStatus({ message: "Failed to load config", kind: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  function listOptOutsSync() {
    // Mirror of service listOptOuts for demo; in production fetch from API.
    return [];
  }

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const toggleSetting = useCallback(
    (key: keyof TwitterConfig, value: boolean) => {
      setConfig((prev) => (prev ? { ...prev, [key]: value } : null));
    },
    [],
  );

  const handleOptOut = useCallback(
    (pid: string) => {
      optOut(pid);
      setOptedOut((prev) => [...prev, pid]);
      setStatus({ message: "Project opted out of auto-tweets", kind: "success" });
    },
    [],
  );

  const handleOptIn = useCallback(
    (pid: string) => {
      optIn(pid);
      setOptedOut((prev) => prev.filter((id) => id !== pid));
      setStatus({ message: "Project opted back in", kind: "success" });
    },
    [],
  );

  const handleManualTweet = useCallback(async () => {
    if (!manualText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/social/tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: manualText }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus({ message: "Tweet posted", kind: "success" });
        setManualText("");
      } else {
        setStatus({ message: json.error?.message || "Tweet failed", kind: "error" });
      }
    } catch {
      setStatus({ message: "Tweet failed", kind: "error" });
    } finally {
      setLoading(false);
    }
  }, [manualText]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Twitter Bot (@DongleApp)</h1>
        <p className="text-muted-foreground">
          Auto-post project verifications and trending projects.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : config ? (
        <>
          <section className="rounded-xl border p-4">
            <h2 className="text-sm font-semibold mb-3">Configuration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingRow
                label="Enabled"
                checked={config.enabled}
                onChange={(v) => toggleSetting("enabled", v)}
                disabled={!config.configured}
              />
              <SettingRow
                label="Tweet verifications (Gold tier)"
                checked={config.autoTweetVerification}
                onChange={(v) => toggleSetting("autoTweetVerification", v)}
              />
              <SettingRow
                label="Tweet weekly top 3 trending"
                checked={config.autoTweetTrending}
                onChange={(v) => toggleSetting("autoTweetTrending", v)}
              />
              <SettingRow
                label="Tweet platform milestones"
                checked={config.autoTweetMilestones}
                onChange={(v) => toggleSetting("autoTweetMilestones", v)}
              />
            </div>
            {!config.configured && (
              <p className="text-xs text-muted-foreground mt-3">
                Configure TWITTER_API_KEY / TWITTER_ACCESS_TOKEN env vars to enable posting.
              </p>
            )}
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="text-sm font-semibold mb-3">Project opt-outs</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Project owners can opt out of auto-tweets.
            </p>
            {optedOut.length === 0 ? (
              <p className="text-sm text-muted-foreground">No opted-out projects.</p>
            ) : (
              <ul className="space-y-2">
                {optedOut.map((pid) => (
                  <li key={pid} className="flex items-center justify-between text-sm">
                    <span className="truncate">{pid}</span>
                    <button onClick={() => handleOptIn(pid)} className="text-xs text-primary underline">Opt in</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <input
                id="optout-project"
                placeholder="Project ID"
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  const id = (document.getElementById("optout-project") as HTMLInputElement).value;
                  if (id) handleOptOut(id);
                }}
                className="px-3 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Opt out
              </button>
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="text-sm font-semibold mb-3">Manual tweet</h2>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="What's happening?"
              className="w-full border rounded p-3 text-sm mb-2"
              maxLength={280}
            />
            <div className="flex gap-2">
              <span className="text-xs text-muted-foreground">
                {manualText.length}/280
              </span>
              <button
                onClick={handleManualTweet}
                disabled={loading || !manualText.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Tweet
              </button>
            </div>
          </section>
        </>
      ) : null}

      {status && (
        <div
          className={`rounded-lg p-3 text-sm ${
            status.kind === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : status.kind === "error"
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}

interface SettingRowProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ label, checked, onChange, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded"
      />
      <span className="text-sm">{label}</span>
      {disabled && <span className="ml-auto text-xs text-muted-foreground">needs API key</span>}
    </div>
  );
}
