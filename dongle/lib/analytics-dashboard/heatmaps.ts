/**
 * Page-level click heatmaps (Issue #713).
 *
 * Aggregates heatmap snapshots captured by `HeatmapCollector` for the four key
 * pages, segments them by device, renders them to a canvas, and exports PNG
 * images. An optional Hotjar / Crazy Egg integration can be enabled through
 * environment variables.
 */

import {
  detectDevice,
  loadStoredHeatmaps,
  pointsToCells,
  type DeviceType,
  type HeatmapSnapshot,
  type HeatPoint,
} from "@/services/form-heatmap";

export interface HeatmapTarget {
  key: string;
  label: string;
  path: string;
}

/** The key pages required by the issue. */
export const HEATMAP_TARGETS: HeatmapTarget[] = [
  { key: "discovery", label: "Discovery page", path: "/discover" },
  { key: "project_detail", label: "Project detail page", path: "/projects/:id" },
  { key: "project_submission", label: "Project submission form", path: "/projects/new" },
  { key: "verification_form", label: "Verification form", path: "/verify" },
];

export interface AggregatedHeatmap {
  target: HeatmapTarget;
  device: DeviceType;
  points: HeatPoint[];
  clickCount: number;
  sessionCount: number;
  maxScrollDepth: number;
  source: "live" | "sample";
}

export function getHeatmapTarget(key: string): HeatmapTarget {
  return HEATMAP_TARGETS.find((target) => target.key === key) ?? HEATMAP_TARGETS[0];
}

/**
 * Merge every locally captured snapshot for a page + device bucket into one
 * weighted grid of heat points.
 */
export function aggregateHeatmaps(
  snapshots: HeatmapSnapshot[],
  targetKey: string,
  device: DeviceType,
): AggregatedHeatmap {
  const target = getHeatmapTarget(targetKey);
  const matching = snapshots.filter(
    (snapshot) => snapshot.formId === targetKey && (snapshot.device ?? "desktop") === device,
  );

  const cells = new Map<string, HeatPoint>();
  let clickCount = 0;
  let maxScrollDepth = 0;

  for (const snapshot of matching) {
    clickCount += snapshot.clicks?.length ?? 0;
    maxScrollDepth = Math.max(maxScrollDepth, snapshot.maxScrollDepth ?? 0);
    for (const point of snapshot.heatPoints ?? []) {
      const key = `${point.x.toFixed(2)}:${point.y.toFixed(2)}`;
      const existing = cells.get(key);
      if (existing) existing.weight += point.weight;
      else cells.set(key, { ...point });
    }
  }

  return {
    target,
    device,
    points: [...cells.values()].sort((a, b) => b.weight - a.weight),
    clickCount,
    sessionCount: matching.length,
    maxScrollDepth,
    source: "live",
  };
}

interface SampleCluster {
  x: number;
  y: number;
  w: number;
  h: number;
  weight: number;
}

/** Where users click on each page — used until real traffic is collected. */
const SAMPLE_LAYOUTS: Record<string, SampleCluster[]> = {
  discovery: [
    { x: 0.5, y: 0.05, w: 0.4, h: 0.06, weight: 6 }, // search bar
    { x: 0.2, y: 0.3, w: 0.3, h: 0.3, weight: 14 }, // project grid
    { x: 0.6, y: 0.3, w: 0.3, h: 0.3, weight: 11 },
    { x: 0.15, y: 0.75, w: 0.7, h: 0.1, weight: 5 }, // pagination
  ],
  project_detail: [
    { x: 0.25, y: 0.12, w: 0.3, h: 0.12, weight: 12 }, // project header
    { x: 0.75, y: 0.15, w: 0.2, h: 0.08, weight: 15 }, // verify CTA
    { x: 0.5, y: 0.45, w: 0.6, h: 0.2, weight: 7 }, // description
    { x: 0.4, y: 0.8, w: 0.5, h: 0.1, weight: 9 }, // reviews
  ],
  project_submission: [
    { x: 0.5, y: 0.15, w: 0.5, h: 0.06, weight: 9 },
    { x: 0.5, y: 0.3, w: 0.5, h: 0.08, weight: 13 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.1, weight: 17 },
    { x: 0.5, y: 0.72, w: 0.3, h: 0.07, weight: 12 },
  ],
  verification_form: [
    { x: 0.5, y: 0.2, w: 0.5, h: 0.07, weight: 10 },
    { x: 0.5, y: 0.38, w: 0.5, h: 0.08, weight: 16 },
    { x: 0.5, y: 0.58, w: 0.5, h: 0.09, weight: 14 },
    { x: 0.5, y: 0.78, w: 0.3, h: 0.06, weight: 8 },
  ],
};

/** Representative heatmap for a page + device when no live data exists. */
export function buildSampleHeatmap(
  targetKey: string,
  device: DeviceType,
  now: Date = new Date(),
): AggregatedHeatmap {
  const target = getHeatmapTarget(targetKey);
  const clusters = SAMPLE_LAYOUTS[targetKey] ?? SAMPLE_LAYOUTS.discovery;
  const points: HeatPoint[] = [];
  const deviceScale = device === "mobile" ? 0.65 : device === "tablet" ? 0.85 : 1;
  let seed = targetKey.length * 97 + now.getUTCDate();
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  for (const cluster of clusters) {
    const perCell = Math.round(cluster.weight * deviceScale);
    for (let i = 0; i < perCell; i += 1) {
      points.push({
        x: Math.min(0.99, Math.max(0.01, cluster.x + (rand() - 0.5) * cluster.w)),
        y: Math.min(0.99, Math.max(0.01, cluster.y + (rand() - 0.5) * cluster.h)),
        weight: 1 + Math.round(rand() * 3),
        timestamp: now.getTime(),
      });
    }
  }

  return {
    target,
    device,
    points: points.sort((a, b) => b.weight - a.weight),
    clickCount: points.reduce((sum, point) => sum + point.weight, 0),
    sessionCount: 12 + points.length,
    maxScrollDepth: 0.72 + 0.2 * deviceScale,
    source: "sample",
  };
}

/** Live heatmap when captured snapshots exist, otherwise the sample layout. */
export function getHeatmap(targetKey: string, device: DeviceType): AggregatedHeatmap {
  const live = aggregateHeatmaps(loadStoredHeatmaps(), targetKey, device);
  return live.points.length > 0 ? live : buildSampleHeatmap(targetKey, device);
}

export interface HeatmapToolConfig {
  provider: "hotjar" | "crazyegg" | "builtin" | null;
  siteId: string | null;
  enabled: boolean;
}

/**
 * Third-party heatmap tool integration (Hotjar / Crazy Egg). Set
 * `NEXT_PUBLIC_HOTJAR_ID` or `NEXT_PUBLIC_CRAZYEGG_ID` to enable.
 */
export function getHeatmapToolConfig(): HeatmapToolConfig {
  const hotjar = process.env.NEXT_PUBLIC_HOTJAR_ID?.trim();
  const crazyegg = process.env.NEXT_PUBLIC_CRAZYEGG_ID?.trim();
  if (hotjar) return { provider: "hotjar", siteId: hotjar, enabled: true };
  if (crazyegg) return { provider: "crazyegg", siteId: crazyegg, enabled: true };
  return { provider: "builtin", siteId: null, enabled: true };
}

function parseRgba(color: string): { r: number; g: number; b: number } | null {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

/**
 * Paint a heatmap onto a canvas. Draws a neutral page wireframe, layered heat
 * blobs, and a colour legend so exports are readable out of context.
 */
export function drawHeatmap(
  canvas: HTMLCanvasElement,
  heatmap: AggregatedHeatmap,
  options: { width?: number; height?: number } = {},
): void {
  const width = options.width ?? canvas.width ?? 800;
  const height = options.height ?? canvas.height ?? 500;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, width, height);

  // Page wireframe so the export shows roughly where clicks landed.
  ctx.fillStyle = "#e4e4e7";
  ctx.fillRect(0, 0, width, height * 0.08);
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(
      width * 0.04 + (i % 2) * width * 0.48,
      height * 0.14 + Math.floor(i / 2) * height * 0.3,
      width * 0.44,
      height * 0.24,
    );
  }

  const cells = pointsToCells(heatmap.points);
  const radius = Math.max(width, height) * 0.07;

  for (const cell of cells) {
    const rgba = parseRgba(cell.color);
    if (!rgba) continue;
    const cx = cell.x * width;
    const cy = cell.y * height;
    const r = radius * (0.5 + cell.intensity);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${0.75 * cell.intensity})`);
    gradient.addColorStop(1, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Legend
  ctx.fillStyle = "#3f3f46";
  ctx.font = "12px sans-serif";
  ctx.fillText(`${heatmap.target.label} · ${heatmap.device} · ${heatmap.clickCount} clicks`, 10, height - 10);
}

/** Trigger a PNG download for a rendered heatmap canvas. */
export function downloadHeatmapImage(
  canvas: HTMLCanvasElement,
  filename = "heatmap.png",
): void {
  if (typeof document === "undefined") return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export { detectDevice };
