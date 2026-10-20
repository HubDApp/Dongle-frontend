"use client";

/**
 * Acquisition attribution dashboard (Issue #715).
 *
 * Shows first/last-touch attribution for the current session and aggregates
 * per-channel acquisition, conversion and engagement metrics.
 */

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BarChart } from "@/components/analytics";
import { downloadCsv } from "@/lib/analytics-dashboard/csv";
import {
  buildSampleAttributionRecords,
  computeAttributionMetrics,
  getAttribution,
  getAttributionRecords,
  toAttributionCsv,
  type AttributionMetric,
  type AttributionState,
} from "@/lib/analytics";
import { Download, Megaphone } from "lucide-react";

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function AttributionPage() {
  const [session, setSession] = useState<AttributionState>({ firstTouch: null, lastTouch: null });
  const [metrics, setMetrics] = useState<AttributionMetric[]>([]);
  const [usingSample, setUsingSample] = useState(false);

  useEffect(() => {
    setSession(getAttribution());
    const records = getAttributionRecords();
    if (records.length > 0) {
      setMetrics(computeAttributionMetrics(records));
    } else {
      setMetrics(computeAttributionMetrics(buildSampleAttributionRecords()));
      setUsingSample(true);
    }
  }, []);

  const chartData = useMemo(
    () => metrics.map((m) => ({ label: m.source, value: m.usersAcquired })),
    [metrics],
  );

  const exportCsv = () => {
    downloadCsv("dongle-attribution.csv", toAttributionCsv(metrics));
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Acquisition Attribution</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Which channels and campaigns bring users in.
            </p>
          </div>
        </div>
        <Button onClick={exportCsv} leftIcon={<Download className="w-4 h-4" />}>
          Export attribution data
        </Button>
      </header>

      {usingSample && (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
          No live attribution recorded in this session — showing representative sample data.
          Visit the site with <code>?utm_source=…</code> to capture real traffic.
        </p>
      )}

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current session</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium mb-1">First touch</p>
            {session.firstTouch ? (
              <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
                <p>
                  {session.firstTouch.source} · {session.firstTouch.medium} ·{" "}
                  {session.firstTouch.campaign}
                </p>
                <p className="font-mono text-xs">{session.firstTouch.landingPage}</p>
              </div>
            ) : (
              <p className="text-zinc-500">No UTM parameters captured.</p>
            )}
          </div>
          <div>
            <p className="font-medium mb-1">Last touch</p>
            {session.lastTouch ? (
              <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
                <p>
                  {session.lastTouch.source} · {session.lastTouch.medium} ·{" "}
                  {session.lastTouch.campaign}
                </p>
                <p className="font-mono text-xs">{session.lastTouch.landingPage}</p>
              </div>
            ) : (
              <p className="text-zinc-500">No UTM parameters captured.</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Users acquired per source</h2>
        <BarChart data={chartData} horizontal height={240} />
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Channel performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Source</th>
                <th className="py-2">Medium</th>
                <th className="py-2">Campaign</th>
                <th className="py-2 text-right">Users</th>
                <th className="py-2 text-right">Conversions</th>
                <th className="py-2 text-right">Conversion rate</th>
                <th className="py-2 text-right">Engagement rate</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr
                  key={`${metric.source}-${metric.medium}-${metric.campaign}`}
                  className="border-b border-zinc-100 dark:border-zinc-800"
                >
                  <td className="py-2 font-medium">{metric.source}</td>
                  <td className="py-2">
                    <Badge variant="outline">{metric.medium}</Badge>
                  </td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">{metric.campaign}</td>
                  <td className="py-2 text-right font-mono">{metric.usersAcquired}</td>
                  <td className="py-2 text-right font-mono">{metric.conversions}</td>
                  <td className="py-2 text-right font-mono">{formatRate(metric.conversionRate)}</td>
                  <td className="py-2 text-right font-mono">{formatRate(metric.engagementRate)}</td>
                </tr>
              ))}
              {metrics.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-zinc-500">
                    No attribution data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
