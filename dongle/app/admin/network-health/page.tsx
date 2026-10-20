"use client";

/**
 * Network health & RPC performance dashboard (Issue #717). Admin only.
 */

import { useMemo, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import WalletGate from "@/components/wallet/WalletGate";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LineChart } from "@/components/analytics";
import {
  buildSampleSamples,
  computeNetworkHealth,
  DEFAULT_THRESHOLDS,
} from "@/lib/analytics-dashboard/network-health";
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

const ADMIN_PURPOSE =
  "Connect an authorized admin Freighter wallet to monitor network health.";

function congestionBadge(level: string) {
  if (level === "high") return "error" as const;
  if (level === "moderate") return "warning" as const;
  return "success" as const;
}

export default function NetworkHealthPage() {
  const { isAdmin, gate } = useAdminAccess();
  const [windowHours] = useState(6);

  const health = useMemo(() => computeNetworkHealth(buildSampleSamples()), []);

  if (gate.state !== "ready") {
    return (
      <div className="container mx-auto px-4 py-32 min-h-screen max-w-2xl">
        <WalletGate
          gate={gate}
          pagePurpose={ADMIN_PURPOSE}
          loadingMessage="Verifying wallet access..."
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center min-h-screen">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Access Restricted</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Network monitoring is limited to authorized admins.
        </p>
      </div>
    );
  }

  const { latency, successRate, failures, congestion, alerts, statusPage, series } = health;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-emerald-500" />
          <div>
            <h1 className="text-3xl font-bold">Network Health</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Stellar/Soroban RPC performance over the last {windowHours} hours.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusPage.status === "operational" ? "success" : statusPage.status === "degraded" ? "warning" : "error"}>
            {statusPage.status}
          </Badge>
          <Badge variant={congestionBadge(congestion)}>{congestion} congestion</Badge>
          {statusPage.url && (
            <a
              href={statusPage.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              Status page <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">p50 latency</p>
          <p className="text-3xl font-bold">{latency.p50.toFixed(0)}ms</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">p95 latency</p>
          <p className="text-3xl font-bold">{latency.p95.toFixed(0)}ms</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">p99 latency</p>
          <p className="text-3xl font-bold">{latency.p99.toFixed(0)}ms</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Tx success rate</p>
          <p className="text-3xl font-bold">{(successRate * 100).toFixed(1)}%</p>
          <p className="text-xs text-zinc-500 mt-1">{health.sampleCount} samples</p>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Card className="p-6 mb-6 border-amber-200 dark:border-amber-900">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Alerts
          </h2>
          <ul className="space-y-2 text-sm">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-center gap-2">
                <Badge variant={alert.severity === "critical" ? "error" : "warning"}>
                  {alert.severity}
                </Badge>
                <span>{alert.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {alerts.length === 0 && (
        <Card className="p-6 mb-6 border-emerald-200 dark:border-emerald-900">
          <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" /> All metrics within thresholds
            (p95 &lt; {DEFAULT_THRESHOLDS.p95LatencyMs}ms, success &ge;{" "}
            {(DEFAULT_THRESHOLDS.successRate * 100).toFixed(0)}%).
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">p95 latency over time</h2>
          <LineChart
            data={series.map((point) => ({
              label: new Date(point.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              value: point.p95,
            }))}
            color="#ef4444"
            height={220}
            formatValue={(v) => `${v.toFixed(0)}ms`}
          />
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Transaction success rate</h2>
          <LineChart
            data={series.map((point) => ({
              label: new Date(point.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              value: point.successRate * 100,
            }))}
            color="#10b981"
            height={220}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Failed transaction reasons</h2>
        {failures.length === 0 ? (
          <p className="text-sm text-zinc-500">No failures in this window.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Reason</th>
                <th className="py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((failure) => (
                <tr key={failure.reason} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-2 font-mono">{failure.reason}</td>
                  <td className="py-2 text-right font-mono">{failure.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-4 text-xs text-zinc-400">
          {statusPage.description} · updated{" "}
          {new Date(statusPage.updatedAt).toLocaleTimeString()}
        </p>
      </Card>
    </div>
  );
}
