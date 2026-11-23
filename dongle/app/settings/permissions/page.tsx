"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import {
  OAUTH_SCOPES,
  PROVIDER_LABEL,
  PROVIDER_PERMISSIONS_URL,
} from "@/lib/auth/oauth-scopes";
import type { OAuthProvider } from "@/lib/auth/session";

const PROVIDERS: OAuthProvider[] = ["google", "github"];

export default function SettingsPermissionsPage() {
  const [connected, setConnected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setConnected(data?.user?.provider ?? null))
      .catch(() => setConnected(null))
      .finally(() => setLoading(false));
  }, []);

  const revoke = async () => {
    setRevoking(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">OAuth permissions</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            What Dongle can access when you sign in with Google or GitHub. Dongle only reads
            this information; it cannot post or change anything on your behalf.
          </p>
        </div>

        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" aria-label="Loading" />
        ) : (
          <div className="space-y-6">
            {PROVIDERS.map((provider) => (
              <section
                key={provider}
                aria-labelledby={`${provider}-scopes`}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
              >
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 id={`${provider}-scopes`} className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {PROVIDER_LABEL[provider]}
                  </h2>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                        connected === provider
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                      }`}
                  >
                    {connected === provider ? "Connected" : "Not connected"}
                  </span>
                </div>
                <ul className="space-y-3">
                  {OAUTH_SCOPES[provider].map((s) => (
                    <li key={s.scope} className="flex gap-3">
                      <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {s.label} <code className="text-xs text-zinc-500">{s.scope}</code>
                        </p>
                        <p className="text-sm text-zinc-500">{s.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <a
                  href={PROVIDER_PERMISSIONS_URL[provider]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm underline text-zinc-600 dark:text-zinc-300"
                >
                  Manage on {PROVIDER_LABEL[provider]} <ExternalLink className="w-3 h-3" />
                </a>
              </section>
            ))}

            <section className="rounded-2xl border border-red-200 dark:border-red-900 bg-white dark:bg-zinc-900 p-6">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Revoke access</h2>
              <p className="mt-1 text-sm text-zinc-500">
                OAuth providers don&apos;t allow revoking individual scopes, so revoking signs you out
                completely. To remove Dongle from your provider account entirely, use the
                &quot;Manage&quot; links above.
              </p>
              {confirming ? (
                <div role="alertdialog" aria-labelledby="revoke-warning" className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 p-4">
                  <p id="revoke-warning" className="text-sm text-red-700 dark:text-red-300">
                    You&apos;ll need to sign in again. Continue?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={revoke}
                      disabled={revoking}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {revoking ? "Revoking…" : "Revoke access"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={!connected}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 disabled:opacity-50"
                >
                  Revoke access
                </button>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
