"use client";

import { useState } from "react";
import { AVAILABLE_METRICS } from "@/services/admin/admin-report.service";

interface ReportBuilderProps {
  onBuild: (metrics: string[], from: string, to: string) => void;
  isBuilding?: boolean;
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function ReportBuilder({ onBuild, isBuilding }: ReportBuilderProps) {
  const [selected, setSelected] = useState<string[]>(["new_projects", "new_reviews", "verifications"]);
  const range = defaultRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <section aria-label="Custom report builder" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
      <h2 className="text-lg font-bold mb-1">Custom report builder</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Select metrics and a date range, then build a one-off report.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {AVAILABLE_METRICS.map((metric) => (
          <label
            key={metric.key}
            className="flex items-center gap-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-xl cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(metric.key)}
              onChange={() => toggle(metric.key)}
              className="accent-zinc-950 dark:accent-white"
            />
            {metric.label}
          </label>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label className="flex-1 text-sm">
          <span className="block text-xs font-semibold text-zinc-500 uppercase mb-1">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="block text-xs font-semibold text-zinc-500 uppercase mb-1">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm"
          />
        </label>
      </div>
      <button
        onClick={() => onBuild(selected, from, to)}
        disabled={isBuilding || selected.length === 0}
        className="px-5 py-2.5 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl text-sm font-bold disabled:opacity-50"
      >
        {isBuilding ? "Building…" : "Build custom report"}
      </button>
    </section>
  );
}
