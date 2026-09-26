"use client";

import { useState } from "react";
import type { ProjectSubmission, ProjectSubmissionModerationStatus } from "@/types/project";
import type { SubmissionSearchFilters } from "@/utils/submission-search.util";
import { Button } from "@/components/ui/Button";
import { Download, Filter, X } from "lucide-react";
import { downloadCsv } from "@/utils/csv-export.util";
import { exportSubmissionsToCsv } from "@/utils/submission-search.util";

interface SubmissionSearchPanelProps {
  filters: SubmissionSearchFilters;
  submissions: ProjectSubmission[];
  filteredCount: number;
  totalCount: number;
  onFiltersChange: (updates: Partial<SubmissionSearchFilters>) => void;
}

const STATUS_OPTIONS: { value: "all" | ProjectSubmissionModerationStatus; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "flagged", label: "Flagged" },
];

export function SubmissionSearchPanel({
  filters,
  submissions,
  filteredCount,
  totalCount,
  onFiltersChange,
}: SubmissionSearchPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters =
    Boolean(filters.query) ||
    (filters.status && filters.status !== "all") ||
    Boolean(filters.submittedFrom) ||
    Boolean(filters.submittedTo) ||
    filters.qualityScoreMin !== undefined ||
    filters.qualityScoreMax !== undefined ||
    filters.flaggedOnly;

  const handleExportCsv = () => {
    const csv = exportSubmissionsToCsv(submissions);
    downloadCsv("dongle-submission-search-results.csv", csv);
  };

  const handleClearFilters = () => {
    onFiltersChange({
      query: "",
      status: "all",
      submittedFrom: undefined,
      submittedTo: undefined,
      qualityScoreMin: undefined,
      qualityScoreMax: undefined,
      flaggedOnly: false,
    });
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
      {/* Basic Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by field value (project name, ID, submitter, flag reason...)"
            value={filters.query}
            onChange={(e) => onFiltersChange({ query: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        </div>

        <div className="flex gap-2">
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ status: e.target.value as any })}
            className="px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[140px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="gap-1.5"
          >
            <span className="text-sm">{showAdvanced ? "Hide" : "Advanced"}</span>
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <label className="text-sm">
            <span className="block mb-1 text-zinc-500">Submitted from</span>
            <input
              type="date"
              value={filters.submittedFrom ?? ""}
              onChange={(e) => onFiltersChange({ submittedFrom: e.target.value || undefined })}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-zinc-500">Submitted to</span>
            <input
              type="date"
              value={filters.submittedTo ?? ""}
              onChange={(e) => onFiltersChange({ submittedTo: e.target.value || undefined })}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-zinc-500">Min quality score</span>
            <input
              type="number"
              min={0}
              max={100}
              value={filters.qualityScoreMin ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  qualityScoreMin: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-zinc-500">Max quality score</span>
            <input
              type="number"
              min={0}
              max={100}
              value={filters.qualityScoreMax ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  qualityScoreMax: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            />
          </label>
        </div>
      )}

      {/* Flagged only & clear filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.flaggedOnly}
              onChange={(e) => onFiltersChange({ flaggedOnly: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Show only flagged submissions</span>
          </label>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1.5">
              <X className="w-4 h-4" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing <span className="font-medium">{filteredCount}</span> of{" "}
            <span className="font-medium">{totalCount}</span> submissions
          </div>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportCsv}
            disabled={filteredCount === 0}
          >
            Export Results
          </Button>
        </div>
      </div>
    </div>
  );
}
