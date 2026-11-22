"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { TimeSeriesPoint } from "@/lib/analytics-dashboard/metrics";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Button } from "@/components/ui/Button";

const WIDTH = 640;
const HEIGHT = 240;
const PAD = { l: 36, r: 16, t: 28, b: 36 };

interface TimeSeriesChartProps {
  series: TimeSeriesPoint[];
  emptyLabel: string;
  onPointClick?: (point: TimeSeriesPoint) => void;
}

function formatPointDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function TimeSeriesChart({
  series,
  emptyLabel,
  onPointClick,
}: TimeSeriesChartProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState<{ start: number; end: number } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ start: number; current: number } | null>(
    null,
  );
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setZoom(null);
    setHoverIndex(null);
    setSelectedIndex(null);
    setDrag(null);
  }, [series]);

  const maxIndex = Math.max(0, series.length - 1);
  const startIndex = zoom
    ? Math.max(0, Math.min(zoom.start, maxIndex))
    : 0;
  const endIndex = zoom
    ? Math.max(startIndex, Math.min(zoom.end, maxIndex))
    : maxIndex;
  const visible = series.slice(startIndex, endIndex + 1);

  const maxProjects = Math.max(1, ...visible.map((point) => point.projects));
  const maxReviews = Math.max(1, ...visible.map((point) => point.reviews));
  const innerW = WIDTH - PAD.l - PAD.r;
  const innerH = HEIGHT - PAD.t - PAD.b;

  const x = (index: number) =>
    PAD.l +
    (visible.length <= 1 ? innerW / 2 : (index / (visible.length - 1)) * innerW);
  const yProjects = (value: number) =>
    PAD.t + innerH - (value / maxProjects) * innerH;
  const yReviews = (value: number) =>
    PAD.t + innerH - (value / maxReviews) * innerH;

  const projectPath = visible
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${yProjects(
          point.projects,
        ).toFixed(1)}`,
    )
    .join(" ");
  const reviewPath = visible
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${yReviews(
          point.reviews,
        ).toFixed(1)}`,
    )
    .join(" ");

  const clampIndex = (index: number) =>
    Math.max(0, Math.min(visible.length - 1, index));

  const activeIndex = drag
    ? drag.current
    : hoverIndex ?? selectedIndex;
  const activePoint =
    activeIndex != null && visible[activeIndex] ? visible[activeIndex] : null;
  const selectedPoint =
    selectedIndex != null && visible[selectedIndex]
      ? visible[selectedIndex]
      : null;

  const indexFromClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg || visible.length === 0) return 0;

    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return 0;

    const svgX = ((clientX - rect.left) / rect.width) * WIDTH;
    const raw =
      ((svgX - PAD.l) / Math.max(1, innerW)) * Math.max(1, visible.length - 1);
    return clampIndex(Math.round(raw));
  };

  const selectPoint = (index: number) => {
    const next = clampIndex(index);
    setSelectedIndex(next);
    if (visible[next]) onPointClick?.(visible[next]);
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (visible.length === 0) return;
    const index = indexFromClientX(event.clientX);
    setDrag({ start: index, current: index });
    setHoverIndex(index);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (visible.length === 0) return;
    const index = indexFromClientX(event.clientX);
    if (drag) {
      setDrag({ ...drag, current: index });
    } else {
      setHoverIndex(index);
    }
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;

    const { start, current } = drag;
    setDrag(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const min = Math.min(start, current);
    const max = Math.max(start, current);

    if (max - min >= 1) {
      setZoom({ start: startIndex + min, end: startIndex + max });
      setHoverIndex(null);
      setSelectedIndex(null);
      return;
    }

    selectPoint(current);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (visible.length === 0) return;

    const current = clampIndex(hoverIndex ?? selectedIndex ?? 0);

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      setHoverIndex(clampIndex(current + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      setHoverIndex(clampIndex(current - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setHoverIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHoverIndex(visible.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectPoint(current);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setZoom(null);
      setSelectedIndex(null);
      setHoverIndex(null);
    }
  };

  const handleExportPng = async () => {
    const svg = svgRef.current;
    if (!svg) return;

    setExporting(true);
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(WIDTH * 2));
      clone.setAttribute("height", String(HEIGHT * 2));

      const serialized = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([serialized], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not render chart"));
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = WIDTH * 2;
      canvas.height = HEIGHT * 2;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not supported");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const downloadUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = "dongle-analytics.png";
        anchor.click();
        URL.revokeObjectURL(downloadUrl);
      }, "image/png");
    } catch (error) {
      console.error("[analytics] PNG export failed", error);
    } finally {
      setExporting(false);
    }
  };

  const summary = t("analytics.timeSeries");

  if (series.length === 0) {
    return (
      <div
        role="img"
        aria-label={emptyLabel}
        className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-zinc-200 text-sm text-zinc-500 dark:border-zinc-800"
      >
        {emptyLabel}
      </div>
    );
  }

  const dragStart = drag ? Math.min(drag.start, drag.current) : null;
  const dragEnd = drag ? Math.max(drag.start, drag.current) : null;

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("analytics.chartHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!zoom}
            onClick={() => {
              setZoom(null);
              setHoverIndex(null);
              setSelectedIndex(null);
            }}
          >
            {t("analytics.resetZoom")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            isLoading={exporting}
            onClick={() => void handleExportPng()}
          >
            {t("analytics.exportPng")}
          </Button>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full cursor-crosshair touch-none text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-zinc-100"
          role="img"
          aria-label={summary}
          aria-describedby="time-series-keyboard-hint"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrag(null)}
          onPointerLeave={() => {
            if (!drag) setHoverIndex(null);
          }}
          onKeyDown={handleKeyDown}
        >
          <title>{summary}</title>
          <desc>
            {`${t("analytics.totalProjects")}: ${
              series[series.length - 1]?.projects ?? 0
            }. ${t("analytics.totalReviews")}: ${
              series[series.length - 1]?.reviews ?? 0
            }.`}
          </desc>

          {[0, 0.5, 1].map((ratio) => (
            <line
              key={`grid-${ratio}`}
              x1={PAD.l}
              y1={PAD.t + innerH * ratio}
              x2={WIDTH - PAD.r}
              y2={PAD.t + innerH * ratio}
              stroke="#e4e4e7"
              strokeWidth="1"
            />
          ))}

          <line
            x1={PAD.l}
            y1={PAD.t + innerH}
            x2={WIDTH - PAD.r}
            y2={PAD.t + innerH}
            stroke="#d4d4d8"
          />
          <path
            d={projectPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={reviewPath}
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {activePoint ? (
            <line
              x1={x(activeIndex ?? 0)}
              y1={PAD.t}
              x2={x(activeIndex ?? 0)}
              y2={PAD.t + innerH}
              stroke="#a1a1aa"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ) : null}

          {dragStart != null && dragEnd != null && dragEnd > dragStart ? (
            <rect
              x={x(dragStart)}
              y={PAD.t}
              width={Math.max(0, x(dragEnd) - x(dragStart))}
              height={innerH}
              fill="#3b82f6"
              opacity="0.14"
            />
          ) : null}

          {visible.map((point, index) => (
            <g key={point.date}>
              <circle
                cx={x(index)}
                cy={yProjects(point.projects)}
                r={activeIndex === index ? 4.5 : 2.5}
                fill="#2563eb"
              />
              <circle
                cx={x(index)}
                cy={yReviews(point.reviews)}
                r={activeIndex === index ? 4.5 : 2.5}
                fill="#059669"
              />
            </g>
          ))}

          <text x={PAD.l} y={16} fill="#2563eb" fontSize="10">
            {t("analytics.chartProjects")}
          </text>
          <text x={PAD.l + 90} y={16} fill="#059669" fontSize="10">
            {t("analytics.chartReviews")}
          </text>
          <text
            x={PAD.l}
            y={HEIGHT - 12}
            fill="#71717a"
            fontSize="10"
            textAnchor="start"
          >
            {formatPointDate(visible[0]?.date ?? "")}
          </text>
          <text
            x={WIDTH - PAD.r}
            y={HEIGHT - 12}
            fill="#71717a"
            fontSize="10"
            textAnchor="end"
          >
            {formatPointDate(visible[visible.length - 1]?.date ?? "")}
          </text>
        </svg>

        {activePoint ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 w-48 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{
              left: `clamp(6rem, ${
                (x(activeIndex ?? 0) / WIDTH) * 100
              }%, calc(100% - 6rem))`,
            }}
          >
            <p className="font-semibold">{formatPointDate(activePoint.date)}</p>
            <dl className="mt-1 space-y-0.5 text-zinc-600 dark:text-zinc-300">
              <div className="flex justify-between gap-3">
                <dt>{t("analytics.totalProjects")}</dt>
                <dd className="font-medium tabular-nums">{activePoint.projects}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t("analytics.totalReviews")}</dt>
                <dd className="font-medium tabular-nums">{activePoint.reviews}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t("analytics.chartVerification")}</dt>
                <dd className="font-medium tabular-nums">
                  {activePoint.verificationRate == null
                    ? "—"
                    : `${(activePoint.verificationRate * 100).toFixed(1)}%`}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>

      <p id="time-series-keyboard-hint" className="sr-only">
        {t("analytics.chartKeyboardHint")}
      </p>
      <p className="sr-only" aria-live="polite">
        {activePoint
          ? `${formatPointDate(activePoint.date)}: ${t(
              "analytics.totalProjects",
            )} ${activePoint.projects}, ${t("analytics.totalReviews")} ${
              activePoint.reviews
            }`
          : ""}
      </p>

      {selectedPoint && !onPointClick ? (
        <div className="mt-3 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p className="font-medium">{formatPointDate(selectedPoint.date)}</p>
          <p className="text-zinc-500 dark:text-zinc-400">
            {t("analytics.totalProjects")}: {selectedPoint.projects} ·{" "}
            {t("analytics.totalReviews")}: {selectedPoint.reviews}
          </p>
        </div>
      ) : null}
    </div>
  );
}
