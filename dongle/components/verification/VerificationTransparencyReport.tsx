"use client";

/**
 * VerificationTransparencyReport
 *
 * Publishes periodic verification statistics for transparency:
 * total verifications, approval rate, avg processing time,
 * top rejection reasons, verification by tier, and trend charts.
 */

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  Shield,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatDate } from "@/lib/date";

interface RejectionReason {
  reason: string;
  count: number;
  percentage: number;
}

interface TierStats {
  tier: string;
  count: number;
  approvalRate: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
  approved: number;
  rejected: number;
}

interface TransparencyReportData {
  period: string;
  totalVerifications: number;
  approvalRate: number;
  avgProcessingTime: string;
  topRejectionReasons: RejectionReason[];
  tierStats: TierStats[];
  monthlyTrends: MonthlyTrend[];
}

interface VerificationTransparencyReportProps {
  data: TransparencyReportData;
  onExportPDF: () => void;
}

function tierColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case "gold":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "silver":
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
}

export default function VerificationTransparencyReport({
  data,
  onExportPDF,
}: VerificationTransparencyReportProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(data.period);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="w-2 h-10 bg-violet-500 rounded-full" />
            Verification Transparency Report
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Published {formatDate(new Date().toISOString())} • Period: {selectedPeriod}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium"
          >
            <option value="2024-01">January 2024</option>
            <option value="2023-12">December 2023</option>
            <option value="2023-11">November 2023</option>
          </select>
          <button
            onClick={onExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl text-violet-500">
              <Shield className="w-5 h-5" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Verifications</p>
          </div>
          <p className="text-3xl font-bold">{data.totalVerifications.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Approval Rate</p>
          </div>
          <p className="text-3xl font-bold text-green-500">{data.approvalRate}%</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Avg Processing Time</p>
          </div>
          <p className="text-3xl font-bold">{data.avgProcessingTime}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-500">
              <BarChart3 className="w-5 h-5" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">This Month</p>
          </div>
          <p className="text-3xl font-bold">
            {data.monthlyTrends[data.monthlyTrends.length - 1]?.total ?? 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top rejection reasons */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Top Rejection Reasons
          </h3>
          <div className="space-y-4">
            {data.topRejectionReasons.map((reason, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{reason.reason}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {reason.count} ({reason.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${reason.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification by tier */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-violet-500" />
            Verification by Tier
          </h3>
          <div className="space-y-4">
            {data.tierStats.map((tier, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tierColor(tier.tier)}`}>
                    {tier.tier}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {tier.count} verifications
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {tier.approvalRate >= 80 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : tier.approvalRate >= 50 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{tier.approvalRate}% approved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly trends chart */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-violet-500" />
          Monthly Trends
        </h3>
        <div className="flex items-end gap-4 h-48">
          {data.monthlyTrends.map((month, i) => {
            const maxTotal = Math.max(...data.monthlyTrends.map((m) => m.total));
            const height = (month.total / maxTotal) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex gap-1">
                  <div
                    className="flex-1 bg-green-500 rounded-t"
                    style={{ height: `${(month.approved / maxTotal) * 160}px` }}
                  />
                  <div
                    className="flex-1 bg-red-500 rounded-t"
                    style={{ height: `${(month.rejected / maxTotal) * 160}px` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{month.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Rejected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
