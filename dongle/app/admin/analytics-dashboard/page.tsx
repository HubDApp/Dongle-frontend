"use client";

import { useState, useEffect, useMemo } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import WalletGate from "@/components/wallet/WalletGate";
import {
  AlertCircle,
  TrendingUp,
  Users,
  Star,
  CheckCircle,
  BarChart3,
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { LineChart, PieChart, BarChart } from "@/components/analytics";
import type { AnalyticsResult, AnalyticsRange } from "@/lib/analytics-dashboard/metrics";
import type { ProjectCategory } from "@/types/project";

const ADMIN_PURPOSE =
  "Connect an authorized admin Freighter wallet to access the analytics dashboard.";

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "DeFi / DEX", label: "DeFi / DEX" },
  { value: "NFTs", label: "NFTs" },
  { value: "Gaming", label: "Gaming" },
  { value: "Infrastructure", label: "Infrastructure" },
  { value: "Payment", label: "Payment" },
  { value: "Social", label: "Social" },
  { value: "Wallet", label: "Wallet" },
  { value: "Other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "VERIFIED", label: "Verified" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NONE", label: "Not Requested" },
];

export default function AnalyticsDashboard() {
  const { isAdmin, gate } = useAdminAccess();
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [category, setCategory] = useState<ProjectCategory | "all">("all");
  const [status, setStatus] = useState<string>("all");

  // Date range picker state
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Fetch analytics data
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          range,
          category,
          status,
        });

        const response = await fetch(`/api/analytics?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [isAdmin, range, category, status]);

  // Export data as CSV
  const handleExportCSV = () => {
    if (!data) return;

    const csvRows = [];

    // Header
    csvRows.push("Metric,Value");

    // Summary metrics
    csvRows.push(`Total Projects,${data.summary.totalProjects}`);
    csvRows.push(`Total Reviews,${data.summary.totalReviews}`);
    csvRows.push(`Average Rating,${data.summary.averageRating?.toFixed(2) ?? "N/A"}`);
    csvRows.push(`Median Review Count,${data.summary.medianReviewCount ?? "N/A"}`);
    csvRows.push(
      `Verification Approval Rate,${data.summary.verificationApprovalRate ? (data.summary.verificationApprovalRate * 100).toFixed(1) + "%" : "N/A"}`
    );
    csvRows.push(`New Projects Per Week,${data.summary.newProjectsPerWeek.toFixed(1)}`);

    // Trending projects
    csvRows.push("");
    csvRows.push("Trending Projects");
    csvRows.push("Name,Category,Reviews/Week,Rating,Review Count");
    data.trending.forEach((project) => {
      csvRows.push(
        `"${project.name}",${project.category},${project.reviewsPerWeek.toFixed(1)},${project.rating},${project.reviewCount}`
      );
    });

    // Category breakdown
    csvRows.push("");
    csvRows.push("Category Breakdown");
    csvRows.push("Category,Count");
    data.categories.forEach((cat) => {
      csvRows.push(`${cat.category},${cat.count}`);
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${range}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Export data as JSON
  const handleExportJSON = () => {
    if (!data) return;

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${range}-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
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
          Your wallet is not on the admin allowlist. Please connect an
          authorized admin wallet to access this dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            Analytics Dashboard
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Track user engagement, project views, and review statistics
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            disabled={!data}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            onClick={handleExportJSON}
            disabled={!data}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-zinc-500" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Time Range"
            value={range}
            onChange={(e) => setRange(e.target.value as AnalyticsRange)}
            options={RANGE_OPTIONS}
          />

          <SelectField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ProjectCategory | "all")}
            options={CATEGORY_OPTIONS}
          />

          <SelectField
            label="Verification Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>

        {/* Custom Date Range (Optional) */}
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Calendar className="w-4 h-4" />
            {showCustomDatePicker ? "Hide" : "Show"} Custom Date Range
          </button>

          {showCustomDatePicker && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      )}

      {error && (
        <Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      {data && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Total Projects
                </h3>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold">{data.summary.totalProjects}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {data.summary.newProjectsPerWeek.toFixed(1)} new/week
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Total Reviews
                </h3>
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold">{data.summary.totalReviews}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Avg rating: {data.summary.averageRating?.toFixed(2) ?? "N/A"}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Verification Rate
                </h3>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold">
                {data.summary.verificationApprovalRate
                  ? `${(data.summary.verificationApprovalRate * 100).toFixed(1)}%`
                  : "N/A"}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Approval rate
              </p>
            </Card>
          </div>

          {/* Trending Projects */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-zinc-500" />
              <h2 className="text-lg font-semibold">Trending Projects</h2>
            </div>

            {data.trending.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
                No trending projects in this time range
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="pb-3 font-medium">Project</th>
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 font-medium text-right">Reviews/Week</th>
                      <th className="pb-3 font-medium text-right">Rating</th>
                      <th className="pb-3 font-medium text-right">Total Reviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trending.map((project) => (
                      <tr
                        key={project.id}
                        className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                      >
                        <td className="py-3 font-medium">{project.name}</td>
                        <td className="py-3 text-zinc-600 dark:text-zinc-400">
                          {project.category}
                        </td>
                        <td className="py-3 text-right font-mono text-sm">
                          {project.reviewsPerWeek.toFixed(1)}
                        </td>
                        <td className="py-3 text-right">
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            {project.rating.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-sm">
                          {project.reviewCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Category Distribution</h2>

              {data.categories.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
                  No projects in this category
                </p>
              ) : (
                <PieChart
                  data={data.categories.map((cat) => ({
                    label: cat.category,
                    value: cat.count,
                  }))}
                  showLegend
                  showPercentages
                />
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Category Breakdown</h2>

              {data.categories.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">
                  No projects in this category
                </p>
              ) : (
                <BarChart
                  data={data.categories.map((cat) => ({
                    label: cat.category,
                    value: cat.count,
                  }))}
                  horizontal
                  height={300}
                />
              )}
            </Card>
          </div>

          {/* Time Series Chart */}
          {data.series && data.series.length > 0 && (
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Activity Over Time</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <LineChart
                    data={data.series.map((point) => ({
                      label: new Date(point.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      }),
                      value: point.projects,
                    }))}
                    title="New Projects"
                    color="#3b82f6"
                    showDots
                    showGrid
                  />
                </div>

                <div>
                  <LineChart
                    data={data.series.map((point) => ({
                      label: new Date(point.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      }),
                      value: point.reviews,
                    }))}
                    title="New Reviews"
                    color="#10b981"
                    showDots
                    showGrid
                  />
                </div>
              </div>

              {data.series.some((p) => p.verificationRate !== null) && (
                <div className="mt-6">
                  <LineChart
                    data={data.series
                      .filter((point) => point.verificationRate !== null)
                      .map((point) => ({
                        label: new Date(point.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        }),
                        value: (point.verificationRate || 0) * 100,
                      }))}
                    title="Verification Rate (%)"
                    color="#f59e0b"
                    showDots
                    showGrid
                    formatValue={(v) => `${v.toFixed(1)}%`}
                  />
                </div>
              )}
            </Card>
          )}

          {/* Metadata */}
          <div className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
            Last updated: {new Date(data.generatedAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
