"use client";

/**
 * Heatmap viewer with page, device, and export controls (Issue #713).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectField } from "@/components/ui/SelectField";
import {
  HEATMAP_TARGETS,
  drawHeatmap,
  downloadHeatmapImage,
  getHeatmap,
  getHeatmapToolConfig,
  type AggregatedHeatmap,
} from "@/lib/analytics-dashboard/heatmaps";
import { DEVICE_TYPES, type DeviceType } from "@/services/form-heatmap";
import { Download, Images } from "lucide-react";

const DEVICE_OPTIONS = DEVICE_TYPES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const PAGE_OPTIONS = HEATMAP_TARGETS.map((target) => ({ value: target.key, label: target.label }));

export function HeatmapViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageKey, setPageKey] = useState(PAGE_OPTIONS[0].value);
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [heatmap, setHeatmap] = useState<AggregatedHeatmap | null>(null);

  const tool = getHeatmapToolConfig();

  useEffect(() => {
    const next = getHeatmap(pageKey, device);
    setHeatmap(next);
    const canvas = canvasRef.current;
    if (canvas) drawHeatmap(canvas, next, { width: 900, height: 560 });
  }, [pageKey, device]);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !heatmap) return;
    drawHeatmap(canvas, heatmap, { width: 900, height: 560 });
    downloadHeatmapImage(canvas, `heatmap-${heatmap.target.key}-${heatmap.device}.png`);
  }, [heatmap]);

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Images className="w-5 h-5 text-zinc-500" />
          <h2 className="text-lg font-semibold">Heatmap viewer</h2>
          {heatmap && (
            <span className="text-xs uppercase tracking-wide text-zinc-400">
              {heatmap.source} data
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <SelectField label="Page" options={PAGE_OPTIONS} value={pageKey} onChange={(e) => setPageKey(e.target.value)} />
          </div>
          <div className="w-36">
            <SelectField
              label="Device"
              options={DEVICE_OPTIONS}
              value={device}
              onChange={(e) => setDevice(e.target.value as DeviceType)}
            />
          </div>
          <Button onClick={handleExport} leftIcon={<Download className="w-4 h-4" />} variant="outline">
            Export image
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${heatmap?.target.label ?? "Page"} click heatmap for ${device}`}
        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800"
      />

      {heatmap && (
        <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <dt className="text-zinc-500">Clicks</dt>
            <dd className="font-mono text-lg">{heatmap.clickCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Sessions</dt>
            <dd className="font-mono text-lg">{heatmap.sessionCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Max scroll depth</dt>
            <dd className="font-mono text-lg">{(heatmap.maxScrollDepth * 100).toFixed(0)}%</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Hotspots</dt>
            <dd className="font-mono text-lg">{heatmap.points.length}</dd>
          </div>
        </dl>
      )}

      <p className="mt-4 text-xs text-zinc-500">
        Third-party integration:{" "}
        {tool.provider === "builtin"
          ? "built-in collector (set NEXT_PUBLIC_HOTJAR_ID or NEXT_PUBLIC_CRAZYEGG_ID to enable Hotjar / Crazy Egg)."
          : `${tool.provider} (site ${tool.siteId}).`}
      </p>
    </Card>
  );
}
