"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

interface EventProcessingHealth {
  status: "healthy" | "degraded";
  redisConfigured: boolean;
  listenerConfigured: boolean;
  workerActive: boolean;
  checkpoint: number;
  latestLedger: number | null;
  lagLedgers: number | null;
  queueDepth: number;
  checkedAt: string;
}

export function EventProcessingMonitor() {
  const [health, setHealth] = useState<EventProcessingHealth | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/events/health", { cache: "no-store" });
        const result = await response.json() as EventProcessingHealth;
        if (active) setHealth(result);
      } catch {
        if (active) setHealth(null);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 15_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const healthy = health?.status === "healthy";
  return (
    <section className="space-y-6" aria-labelledby="event-monitor-title">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <h2 id="event-monitor-title" className="text-xl font-semibold">Event processing</h2>
          <p className="mt-1 text-sm text-zinc-500">Soroban listener and queue health</p>
        </div>
        {healthy ? (
          <span className="inline-flex items-center gap-2 text-sm text-green-700 dark:text-green-400"><CheckCircle2 size={17} /> Healthy</span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400"><AlertTriangle size={17} /> Degraded</span>
        )}
      </header>
      {!health?.listenerConfigured && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">Configure the Soroban RPC URL and contract ID to start monitoring.</p>
      )}
      {health?.listenerConfigured && !health.workerActive && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">The event worker has not reported a heartbeat in the last 30 seconds.</p>
      )}
      {!health?.redisConfigured && health?.listenerConfigured && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">Redis is not configured. Queue and checkpoint state is process-local and will not be shared with a separate worker.</p>
      )}
      <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Processing lag</dt>
          <dd className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Activity size={18} />{health?.lagLedgers ?? "--"}<span className="text-sm font-normal text-zinc-500">ledgers</span></dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Queued events</dt>
          <dd className="mt-1 text-2xl font-semibold">{health?.queueDepth ?? "--"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Indexed ledger</dt>
          <dd className="mt-1 text-2xl font-semibold">{health?.checkpoint || "--"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Latest ledger</dt>
          <dd className="mt-1 text-2xl font-semibold">{health?.latestLedger ?? "--"}</dd>
        </div>
      </dl>
      {health?.checkedAt && <p className="text-xs text-zinc-500">Updated {new Date(health.checkedAt).toLocaleTimeString()}</p>}
    </section>
  );
}