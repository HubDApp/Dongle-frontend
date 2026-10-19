"use client";

/**
 * Page heatmap dashboard (Issue #713).
 *
 * Shows click heatmaps for the discovery page, project detail page, project
 * submission form, and verification form, filtered by device, with PNG export.
 */

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { HeatmapViewer } from "@/components/analytics";
import { clearStoredHeatmaps, loadStoredHeatmaps } from "@/services/form-heatmap";
import { HEATMAP_TARGETS } from "@/lib/analytics-dashboard/heatmaps";
import { Button } from "@/components/ui/Button";
import { MousePointerClick, Trash2 } from "lucide-react";

export default function HeatmapsPage() {
  const [captured, setCaptured] = useState(0);

  useEffect(() => {
    setCaptured(loadStoredHeatmaps().length);
  }, []);

  const handleClear = () => {
    clearStoredHeatmaps();
    setCaptured(0);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <MousePointerClick className="w-8 h-8 text-rose-500" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Click Heatmaps</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Where users click on the pages that matter most.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleClear} leftIcon={<Trash2 className="w-4 h-4" />}>
          Clear captured sessions ({captured})
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {HEATMAP_TARGETS.map((target) => (
          <Card key={target.key} className="p-4">
            <p className="font-medium">{target.label}</p>
            <p className="text-xs font-mono text-zinc-500">{target.path}</p>
          </Card>
        ))}
      </div>

      <HeatmapViewer />
    </main>
  );
}
