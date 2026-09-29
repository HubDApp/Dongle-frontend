"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getOrAssignVariant,
  trackExperimentEvent,
  computeExperimentResults,
} from "@/services/form-experiments";
import type {
  ExperimentVariant,
  FormExperiment,
  ExperimentResults,
} from "@/services/form-experiments";

interface UseFormExperimentOptions {
  experimentId: string;
  userId?: string;
  autoTrackImpression?: boolean;
}

export function useFormExperiment({
  experimentId,
  userId,
  autoTrackImpression = true,
}: UseFormExperimentOptions) {
  const [variant, setVariant] = useState<ExperimentVariant>({
    id: "control",
    name: "Control",
    description: "Default fallback",
    weight: 100,
    isControl: true,
  });
  const [experiment, setExperiment] = useState<FormExperiment | null>(null);
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const hasTrackedStartRef = useRef<boolean>(false);
  const hasTrackedImpressionRef = useRef<boolean>(false);

  useEffect(() => {
    const { variant: assignedVariant, experiment: exp } = getOrAssignVariant(
      experimentId,
      userId,
    );
    setVariant(assignedVariant);
    setExperiment(exp);

    if (autoTrackImpression && !hasTrackedImpressionRef.current) {
      hasTrackedImpressionRef.current = true;
      trackExperimentEvent(experimentId, assignedVariant.id, "impression");
    }

    setResults(computeExperimentResults(experimentId));
  }, [experimentId, userId, autoTrackImpression]);

  const trackStart = useCallback(() => {
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      startTimeRef.current = Date.now();
      trackExperimentEvent(experimentId, variant.id, "start");
    }
  }, [experimentId, variant.id]);

  const trackError = useCallback(() => {
    trackExperimentEvent(experimentId, variant.id, "error");
  }, [experimentId, variant.id]);

  const trackSubmission = useCallback(() => {
    const durationMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    trackExperimentEvent(experimentId, variant.id, "submission", durationMs);
    setResults(computeExperimentResults(experimentId));
  }, [experimentId, variant.id]);

  return {
    variant,
    isControl: Boolean(variant.isControl),
    experiment,
    results,
    trackStart,
    trackError,
    trackSubmission,
  };
}
