"use client";

/**
 * Custom report builder (Issue #710) at /analytics/custom.
 *
 * Select dimensions and metrics, preview as table/line/bar, save reports, and
 * schedule recurring delivery or export as PDF/CSV.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/SelectField";
import { BarChart, LineChart } from "@/components/analytics";
import { downloadCsv } from "@/lib/analytics-dashboard/csv";
import {
  REPORT_DIMENSIONS,
  REPORT_METRICS,
  buildReport,
  createDefaultQuery,
  deleteReport,
  exportReportPdf,
  loadSavedReports,
  saveReport,
  toReportCsv,
  updateReport,
  type ReportQuery,
  type ReportSchedule,
  type ReportVisualization,
  type SavedReport,
} from "@/lib/analytics-dashboard/report-builder";
import { ALL_CATEGORIES, type ProjectCategory } from "@/types/project";
import { FileBarChart2, FileDown, FileText, Save, Trash2 } from "lucide-react";

const VISUALIZATIONS: Array<{ value: ReportVisualization; label: string }> = [
  { value: "table", label: "Table" },
  { value: "line", label: "Line chart" },
  { value: "bar", label: "Bar chart" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "VERIFIED", label: "Verified" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NONE", label: "Not requested" },
];

const FREQUENCIES: Array<{ value: ReportSchedule["frequency"]; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All categories" },
  ...ALL_CATEGORIES.filter((value) => value !== "All").map((value) => ({ value, label: value })),
];

export default function CustomReportPage() {
  const [query, setQuery] = useState<ReportQuery>(createDefaultQuery());
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [frequency, setFrequency] = useState<ReportSchedule["frequency"]>("weekly");

  useEffect(() => setSaved(loadSavedReports()), []);

  const report = useMemo(() => buildReport(query), [query]);

  const toggleDimension = (dimension: ReportQuery["dimensions"][number]) => {
    setQuery((current) => ({
      ...current,
      dimensions: current.dimensions.includes(dimension)
        ? current.dimensions.filter((d) => d !== dimension)
        : [...current.dimensions, dimension],
    }));
  };

  const toggleMetric = (metric: ReportQuery["metrics"][number]) => {
    setQuery((current) => ({
      ...current,
      metrics: current.metrics.includes(metric)
        ? current.metrics.filter((m) => m !== metric)
        : [...current.metrics, metric],
    }));
  };

  const handleSave = useCallback(() => {
    saveReport(query, {
      enabled: scheduleEnabled,
      frequency,
      email: scheduleEmail,
    });
    setSaved(loadSavedReports());
  }, [query, scheduleEnabled, frequency, scheduleEmail]);

  const handleLoad = (reportToLoad: SavedReport) => {
    setQuery({
      name: reportToLoad.name,
      dimensions: reportToLoad.dimensions,
      metrics: reportToLoad.metrics,
      visualization: reportToLoad.visualization,
      category: reportToLoad.category,
      verificationStatus: reportToLoad.verificationStatus,
      from: reportToLoad.from,
      to: reportToLoad.to,
    });
    setScheduleEnabled(reportToLoad.schedule.enabled);
    setFrequency(reportToLoad.schedule.frequency);
    setScheduleEmail(reportToLoad.schedule.email);
  };

  const handleDelete = (id: string) => {
    deleteReport(id);
    setSaved(loadSavedReports());
  };

  const handleToggleSchedule = (reportToSave: SavedReport) => {
    updateReport({
      ...reportToSave,
      schedule: { ...reportToSave.schedule, enabled: !reportToSave.schedule.enabled },
    });
    setSaved(loadSavedReports());
  };

  const handleExportCsv = () => {
    downloadCsv(`report-${query.name.replace(/\s+/g, "-").toLowerCase()}.csv`, toReportCsv(report, query));
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileBarChart2 className="w-8 h-8 text-indigo-500" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Custom Report Builder</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Choose dimensions, metrics, and a visualization.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportReportPdf(query.name)}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleExportCsv} leftIcon={<FileDown className="w-4 h-4" />}>
            Export CSV
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Report configuration</h2>

          <label className="block text-sm font-medium mb-1" htmlFor="report-name">
            Name
          </label>
          <input
            id="report-name"
            value={query.name}
            onChange={(e) => setQuery({ ...query, name: e.target.value })}
            className="mb-4 w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
          />

          <fieldset className="mb-4">
            <legend className="text-sm font-medium mb-2">Dimensions</legend>
            <div className="space-y-1">
              {REPORT_DIMENSIONS.map((dimension) => (
                <label key={dimension.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={query.dimensions.includes(dimension.value)}
                    onChange={() => toggleDimension(dimension.value)}
                  />
                  {dimension.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="text-sm font-medium mb-2">Metrics</legend>
            <div className="space-y-1">
              {REPORT_METRICS.map((metric) => (
                <label key={metric.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={query.metrics.includes(metric.value)}
                    onChange={() => toggleMetric(metric.value)}
                  />
                  {metric.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3">
            <SelectField
              label="Visualization"
              options={VISUALIZATIONS}
              value={query.visualization}
              onChange={(e) => setQuery({ ...query, visualization: e.target.value as ReportVisualization })}
            />
            <SelectField
              label="Category"
              options={CATEGORY_OPTIONS}
              value={query.category}
              onChange={(e) => setQuery({ ...query, category: e.target.value as ProjectCategory | "all" })}
            />
            <SelectField
              label="Verification status"
              options={STATUS_OPTIONS}
              value={query.verificationStatus}
              onChange={(e) =>
                setQuery({
                  ...query,
                  verificationStatus: e.target.value as ReportQuery["verificationStatus"],
                })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="from">
                  From
                </label>
                <input
                  id="from"
                  type="date"
                  value={query.from ?? ""}
                  onChange={(e) => setQuery({ ...query, from: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="to">
                  To
                </label>
                <input
                  id="to"
                  type="date"
                  value={query.to ?? ""}
                  onChange={(e) => setQuery({ ...query, to: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
              />
              Schedule recurring report (email)
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Schedule frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ReportSchedule["frequency"])}
                className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm"
              >
                {FREQUENCIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                aria-label="Report email"
                placeholder="team@example.com"
                value={scheduleEmail}
                onChange={(e) => setScheduleEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm"
              />
            </div>
            <Button onClick={handleSave} className="w-full" leftIcon={<Save className="w-4 h-4" />}>
              Save report
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Preview — {query.name}</h2>
              <span className="text-xs text-zinc-500">
                {report.rows.length} rows · {report.generatedAt.slice(0, 10)}
              </span>
            </div>

            {report.rows.length === 0 ? (
              <p className="py-8 text-center text-zinc-500">
                No data matches these filters.
              </p>
            ) : query.visualization === "line" ? (
              <div className="space-y-4">
                {query.metrics.map((metric) => (
                  <LineChart
                    key={metric}
                    title={metric}
                    data={report.rows.map((row) => ({ label: row.label, value: row.values[metric] }))}
                    height={180}
                  />
                ))}
              </div>
            ) : query.visualization === "bar" ? (
              <div className="space-y-4">
                {query.metrics.map((metric) => (
                  <BarChart
                    key={metric}
                    title={metric}
                    data={report.rows.map((row) => ({ label: row.label, value: row.values[metric] }))}
                    height={200}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="py-2">Group</th>
                      {query.metrics.map((metric) => (
                        <th key={metric} className="py-2 text-right">
                          {metric}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.label} className="border-b border-zinc-100 dark:border-zinc-800">
                        <td className="py-2 font-medium">{row.label}</td>
                        {query.metrics.map((metric) => (
                          <td key={metric} className="py-2 text-right font-mono">
                            {row.values[metric].toFixed(metric === "ratings" ? 2 : 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="py-2">Total</td>
                      {query.metrics.map((metric) => (
                        <td key={metric} className="py-2 text-right font-mono">
                          {report.totals[metric].toFixed(metric === "ratings" ? 2 : 0)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Saved reports</h2>
            {saved.length === 0 ? (
              <p className="text-sm text-zinc-500">No saved reports yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {saved.map((reportItem) => (
                  <li key={reportItem.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">{reportItem.name}</p>
                      <p className="text-xs text-zinc-500">
                        {reportItem.dimensions.join(" + ")} · {reportItem.metrics.join(", ")} ·{" "}
                        {reportItem.visualization}
                        {reportItem.schedule.enabled &&
                          ` · ${reportItem.schedule.frequency} email to ${reportItem.schedule.email || "unset"}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleLoad(reportItem)}>
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleSchedule(reportItem)}
                      >
                        {reportItem.schedule.enabled ? "Pause schedule" : "Enable schedule"}
                      </Button>
                      <Button
                        size="sm"
                        variant="error"
                        onClick={() => handleDelete(reportItem.id)}
                        leftIcon={<Trash2 className="w-3 h-3" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
