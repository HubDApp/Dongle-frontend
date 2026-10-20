"use client";

/**
 * Competitor benchmark dashboard (Issue #712) at /analytics/benchmarks.
 */

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BarChart, LineChart } from "@/components/analytics";
import { downloadCsv } from "@/lib/analytics-dashboard/csv";
import {
  BENCHMARK_METRICS,
  buildBenchmarkSeries,
  buildCompetitorBenchmarks,
  computeBenchmarkRows,
  computePlatformMetrics,
  formatBenchmarkValue,
  toBenchmarkCsv,
  type CompetitorBenchmark,
} from "@/lib/analytics-dashboard/benchmarks";
import { Download, Scale } from "lucide-react";

const SOURCE_LABEL: Record<string, string> = {
  public_api: "Public API",
  manual_entry: "Manual entry",
};

export default function BenchmarksPage() {
  const [competitors, setCompetitors] = useState<CompetitorBenchmark[]>([]);

  useEffect(() => setCompetitors(buildCompetitorBenchmarks()), []);

  const platform = useMemo(() => computePlatformMetrics(), []);
  const rows = useMemo(() => computeBenchmarkRows(platform, competitors), [platform, competitors]);
  const series = useMemo(
    () => buildBenchmarkSeries(platform, competitors),
    [platform, competitors],
  );

  const months = useMemo(() => [...new Set(series.map((point) => point.month))], [series]);
  const seriesNames = useMemo(() => [...new Set(series.map((point) => point.series))], [series]);

  const valueFor = (month: string, name: string) =>
    series.find((point) => point.month === month && point.series === name)?.value ?? 0;

  const handleExport = () => {
    downloadCsv("dongle-benchmarks.csv", toBenchmarkCsv(rows));
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Scale className="w-8 h-8 text-teal-500" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Competitor Benchmarks</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Dongle vs. ecosystem directories, with exportable benchmark report.
            </p>
          </div>
        </div>
        <Button onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>
          Export benchmark report
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {BENCHMARK_METRICS.map((metric) => {
          const row = rows.find((candidate) => candidate.key === metric.key);
          return (
            <Card key={metric.key} className="p-6">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{metric.label}</p>
              <p className="text-3xl font-bold">{formatBenchmarkValue(row?.ours ?? 0, metric.format)}</p>
              <p className="text-xs text-zinc-500 mt-1">
                best competitor:{" "}
                {row
                  ? formatBenchmarkValue(
                      Math.max(...rows.filter((r) => r.key === metric.key).map((r) => r.theirs)),
                      metric.format,
                    )
                  : "—"}
              </p>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Metric comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Metric</th>
                <th className="py-2 text-right">Dongle</th>
                <th className="py-2">Competitor</th>
                <th className="py-2 text-right">Them</th>
                <th className="py-2 text-right">Delta</th>
                <th className="py-2 text-right">Winner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.key}-${row.competitorId}`}
                  className="border-b border-zinc-100 dark:border-zinc-800"
                >
                  <td className="py-2 font-medium">{row.label}</td>
                  <td className="py-2 text-right font-mono">
                    {formatBenchmarkValue(row.ours, row.format)}
                  </td>
                  <td className="py-2">
                    {row.competitorName}{" "}
                    <Badge variant="outline">
                      {SOURCE_LABEL[competitors.find((c) => c.id === row.competitorId)?.source ?? "public_api"]}
                    </Badge>
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatBenchmarkValue(row.theirs, row.format)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {row.delta > 0 ? row.delta.toFixed(2) : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <Badge variant={row.winner === "us" ? "success" : row.winner === "them" ? "warning" : "secondary"}>
                      {row.winner === "us" ? "Dongle" : row.winner === "them" ? row.competitorName : "tie"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Total projects over time</h2>
          <div className="space-y-4">
            {seriesNames.map((name) => (
              <LineChart
                key={name}
                title={name}
                data={months.map((month) => ({ label: month, value: valueFor(month, name) }))}
                height={140}
                formatValue={(v) => v.toFixed(0)}
              />
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Current snapshot</h2>
          <BarChart
            data={BENCHMARK_METRICS.map((metric) => {
              const row = rows.find((candidate) => candidate.key === metric.key);
              return { label: `${metric.label} (Dongle)`, value: row?.ours ?? 0 };
            })}
            horizontal
            height={240}
          />
          <ul className="mt-4 space-y-1 text-xs text-zinc-500">
            {competitors.map((competitor) => (
              <li key={competitor.id}>
                {competitor.name} — {SOURCE_LABEL[competitor.source]} · updated{" "}
                {competitor.updatedAt.slice(0, 10)}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
