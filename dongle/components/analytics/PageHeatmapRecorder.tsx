"use client";

/**
 * Records click heatmaps for a page (Issue #713).
 *
 * Renders nothing: it attaches a `HeatmapCollector` to the page's main
 * container and persists a snapshot when the user leaves the page.
 */

import { useEffect } from "react";
import { HeatmapCollector } from "@/services/form-heatmap";

export interface PageHeatmapRecorderProps {
  /** Heatmap target key — see `HEATMAP_TARGETS`. */
  page: string;
}

export default function PageHeatmapRecorder({ page }: PageHeatmapRecorderProps) {
  useEffect(() => {
    const container =
      (document.querySelector<HTMLElement>("main") as HTMLElement | null) ?? document.body;
    const collector = new HeatmapCollector(page, "page");
    collector.attach(container);

    let persisted = false;
    const persist = () => {
      if (persisted) return;
      persisted = true;
      try {
        collector.snapshot();
      } catch {
        /* never break navigation for analytics */
      }
    };

    window.addEventListener("pagehide", persist);
    return () => {
      persist();
      window.removeEventListener("pagehide", persist);
      collector.detach();
    };
  }, [page]);

  return null;
}
