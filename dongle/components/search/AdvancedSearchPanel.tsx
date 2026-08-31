"use client";

import { useMemo, useState } from "react";
import type { AdvancedSearchFilters } from "@/types/search";
import {
  SEARCH_PRESETS,
  getSearchAutocompleteSuggestions,
} from "@/utils/advanced-search.util";
import { projectService } from "@/services/project/project.service";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";
import { Button } from "@/components/ui/Button";
import { Download, Save } from "lucide-react";
import { downloadCsv, exportProjectsToCsv } from "@/utils/csv-export.util";
import { applyAdvancedFilters } from "@/utils/advanced-search.util";
import { savedSearchService } from "@/services/search/saved-search.service";

interface AdvancedSearchPanelProps {
  filters: AdvancedSearchFilters;
  verificationStatuses: Record<string, VerificationStatus>;
  walletAddress?: string | null;
  onFiltersChange: (updates: Partial<AdvancedSearchFilters>) => void;
  onApplyPreset: (presetId: AdvancedSearchFilters["preset"]) => void;
}

export function AdvancedSearchPanel({
  filters,
  verificationStatuses,
  walletAddress,
  onFiltersChange,
  onApplyPreset,
}: AdvancedSearchPanelProps) {
  const [saveName, setSaveName] = useState("");
  const suggestions = useMemo(
    () => getSearchAutocompleteSuggestions(filters.query),
    [filters.query],
  );

  const handleExportCsv = () => {
    const projects = applyAdvancedFilters(
      projectService.getDiscoverableProjects(),
      filters,
      verificationStatuses,
    );
    const csv = exportProjectsToCsv(projects);
    downloadCsv("dongle-search-results.csv", csv);
  };

  const handleSaveSearch = () => {
    if (!walletAddress || !saveName.trim()) return;
    const { page: _page, ...rest } = filters;
    const result = savedSearchService.saveSearch(walletAddress, saveName.trim(), rest);
    if (result.success) {
      setSaveName("");
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
      <div className="flex flex-wrap gap-2">
        {SEARCH_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            size="sm"
            variant={filters.preset === preset.id ? "primary" : "outline"}
            onClick={() => onApplyPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-sm">
          <span className="block mb-1 text-zinc-500">Min rating</span>
          <input
            type="number"
            min={1}
            max={5}
            step={0.1}
            value={filters.ratingMin ?? ""}
            onChange={(e) =>
              onFiltersChange({
                ratingMin: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-zinc-500">Max rating</span>
          <input
            type="number"
            min={1}
            max={5}
            step={0.1}
            value={filters.ratingMax ?? ""}
            onChange={(e) =>
              onFiltersChange({
                ratingMax: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-zinc-500">Owner address</span>
          <input
            type="text"
            placeholder="G..."
            value={filters.ownerAddress ?? ""}
            onChange={(e) => onFiltersChange({ ownerAddress: e.target.value || undefined })}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-zinc-500">Verification</span>
          <select
            value={filters.verification}
            onChange={(e) =>
              onFiltersChange({
                verification: e.target.value as AdvancedSearchFilters["verification"],
              })
            }
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          >
            <option value="ALL">All</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="NONE">None</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-zinc-500">Created from</span>
          <input
            type="date"
            value={filters.createdFrom ?? ""}
            onChange={(e) => onFiltersChange({ createdFrom: e.target.value || undefined })}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-zinc-500">Created to</span>
          <input
            type="date"
            value={filters.createdTo ?? ""}
            onChange={(e) => onFiltersChange({ createdTo: e.target.value || undefined })}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          />
        </label>
      </div>

      {(suggestions.projectNames.length > 0 || suggestions.categories.length > 0) && (
        <div className="text-sm text-zinc-500">
          Suggestions:{" "}
          {[...suggestions.projectNames, ...suggestions.categories].slice(0, 6).join(" · ")}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCsv}>
          Export CSV
        </Button>
        {walletAddress && (
          <>
            <input
              type="text"
              placeholder="Saved search name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Save className="w-4 h-4" />}
              disabled={!saveName.trim()}
              onClick={handleSaveSearch}
            >
              Save search
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
