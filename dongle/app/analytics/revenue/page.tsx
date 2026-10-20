"use client";

/**
 * Verification fee revenue dashboard (Issue #716). Admin only.
 */

import { useMemo, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import WalletGate from "@/components/wallet/WalletGate";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BarChart, LineChart } from "@/components/analytics";
import { downloadCsv } from "@/lib/analytics-dashboard/csv";
import {
  buildSampleFees,
  computeRevenue,
  toRevenueCsv,
  DEFAULT_XLM_USD_RATE,
} from "@/lib/analytics-dashboard/revenue";
import { AlertCircle, Coins, Download, TrendingUp, Wallet } from "lucide-react";

const ADMIN_PURPOSE =
  "Connect an authorized admin Freighter wallet to view revenue analytics.";

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function RevenuePage() {
  const { isAdmin, gate } = useAdminAccess();
  const [xlmUsdRate, setXlmUsdRate] = useState(DEFAULT_XLM_USD_RATE);

  const report = useMemo(
    () => computeRevenue(buildSampleFees(), xlmUsdRate),
    [xlmUsdRate],
  );

  const exportCsv = () => {
    downloadCsv("dongle-revenue.csv", toRevenueCsv(report));
  };

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
          Revenue analytics are limited to authorized admins.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Coins className="w-8 h-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold">Verification Revenue</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Fees collected per verification tier with a 3-month forecast.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-500" htmlFor="xlm-rate">
            XLM/USD
          </label>
          <input
            id="xlm-rate"
            type="number"
            step="0.01"
            min="0"
            value={xlmUsdRate}
            onChange={(e) => setXlmUsdRate(Number(e.target.value) || 0)}
            className="w-24 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
          />
          <Button onClick={exportCsv} leftIcon={<Download className="w-4 h-4" />}>
            Export report
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Total revenue</p>
          <p className="text-3xl font-bold">{report.totalXlm.toLocaleString()} XLM</p>
          <p className="text-sm text-zinc-500 mt-1">{formatUsd(report.totalUsd)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Avg transaction</p>
          <p className="text-3xl font-bold">{report.averageTransactionXlm.toFixed(1)} XLM</p>
          <p className="text-sm text-zinc-500 mt-1">
            {formatUsd(report.averageTransactionUsd)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Monthly recurring</p>
          <p className="text-3xl font-bold">{formatUsd(report.monthlyRecurringUsd)}</p>
          <p className="text-sm text-zinc-500 mt-1">Current month (MRR)</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Next 3 months</p>
          <p className="text-3xl font-bold">
            {formatUsd(report.forecast.reduce((sum, p) => sum + p.usd, 0))}
          </p>
          <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> projected
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue by tier</h2>
          <BarChart
            data={report.byTier.map((tier) => ({ label: tier.tier, value: tier.xlm }))}
            horizontal
            height={220}
            formatValue={(v) => `${v.toFixed(0)} XLM`}
          />
          <table className="w-full mt-4 text-left text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Tier</th>
                <th className="py-2 text-right">Count</th>
                <th className="py-2 text-right">XLM</th>
                <th className="py-2 text-right">USD</th>
              </tr>
            </thead>
            <tbody>
              {report.byTier.map((tier) => (
                <tr key={tier.tier} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-2 font-medium">
                    <Badge variant="outline">{tier.tier}</Badge>
                  </td>
                  <td className="py-2 text-right font-mono">{tier.count}</td>
                  <td className="py-2 text-right font-mono">{tier.xlm.toLocaleString()}</td>
                  <td className="py-2 text-right font-mono">{formatUsd(tier.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Monthly revenue trend</h2>
          <LineChart
            data={report.monthly.map((point) => ({ label: point.month, value: point.xlm }))}
            color="#f59e0b"
            height={220}
            formatValue={(v) => `${v.toFixed(0)}`}
          />
          <h3 className="text-sm font-medium mt-6 mb-2">Forecast (next 3 months)</h3>
          <ul className="space-y-1 text-sm">
            {report.forecast.map((point) => (
              <li key={point.month} className="flex items-center justify-between">
                <span className="text-zinc-500">{point.month}</span>
                <span className="font-mono">
                  {point.xlm.toFixed(1)} XLM · {formatUsd(point.usd)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="text-xs text-zinc-400 flex items-center gap-1">
        <Wallet className="w-3 h-3" /> Rate {xlmUsdRate} USD/XLM · generated{" "}
        {new Date(report.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
