/**
 * Hook: attach form heat mapping (clicks, scroll, mouse, problem areas).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HeatmapCollector,
  pointsToCells,
  type HeatCell,
  type HeatmapConfig,
  type HeatmapSnapshot,
  type ProblemArea,
} from "@/services/form-heatmap";

export interface UseFormHeatmapOptions {
  formId: string;
  formType: string;
  enabled?: boolean;
  config?: Partial<HeatmapConfig>;
}

export function useFormHeatmap(options: UseFormHeatmapOptions) {
  const { formId, formType, enabled = true, config } = options;
  const collectorRef = useRef<HeatmapCollector | null>(null);
  const formRef = useRef<HTMLElement | null>(null);
  const [snapshot, setSnapshot] = useState<HeatmapSnapshot | null>(null);
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [problemAreas, setProblemAreas] = useState<ProblemArea[]>([]);

  const attachRef = useCallback(
    (node: HTMLElement | null) => {
      if (formRef.current && collectorRef.current) {
        collectorRef.current.detach();
      }
      formRef.current = node;
      if (!node || !enabled) return;

      const collector = new HeatmapCollector(formId, formType, config);
      collectorRef.current = collector;
      collector.attach(node);
    },
    [formId, formType, enabled, config],
  );

  useEffect(() => {
    return () => {
      collectorRef.current?.detach();
    };
  }, []);

  const captureSnapshot = useCallback((): HeatmapSnapshot | null => {
    if (!collectorRef.current) return null;
    const snap = collectorRef.current.snapshot();
    setSnapshot(snap);
    setCells(pointsToCells(snap.heatPoints));
    setProblemAreas(snap.problemAreas);
    return snap;
  }, []);

  return {
    formRef: attachRef,
    snapshot,
    cells,
    problemAreas,
    captureSnapshot,
    getCollector: () => collectorRef.current,
  };
}
