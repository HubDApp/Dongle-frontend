/**
 * Form Experimentation & A/B Testing Engine
 */

import { generateId } from "@/lib/id-generator";
import { nowUTC } from "@/lib/date";
import {
  loadExperiments,
  saveExperiments,
  getExperimentById,
  recordVariantMetric,
  getVariantMetrics,
  loadAssignments,
  saveAssignment,
} from "./store";
import { assignVariant, getOrCreateAnonymousUserId } from "./bucketing";
import { calculateZTest, calculateConfidenceInterval95 } from "./statistics";
import type {
  FormExperiment,
  ExperimentVariant,
  VariantStatistics,
  ExperimentResults,
} from "./types";

/**
 * Get or assign a variant for the current user in an experiment
 */
export function getOrAssignVariant(
  experimentId: string,
  userId?: string,
): { variant: ExperimentVariant; isNewAssignment: boolean; experiment: FormExperiment | null } {
  const experiment = getExperimentById(experimentId);
  if (!experiment) {
    return {
      variant: {
        id: "control",
        name: "Control",
        description: "Default fallback",
        weight: 100,
        isControl: true,
      },
      isNewAssignment: false,
      experiment: null,
    };
  }

  // If winner is rolled out to 100%
  if (experiment.winnerVariantId && experiment.rolloutWinnerToAll) {
    const winner = experiment.variants.find((v) => v.id === experiment.winnerVariantId);
    if (winner) {
      return { variant: winner, isNewAssignment: false, experiment };
    }
  }

  const effectiveUserId = userId || getOrCreateAnonymousUserId();
  const assignments = loadAssignments();
  const assignmentKey = `${experimentId}:${effectiveUserId}`;

  if (assignments[assignmentKey]) {
    const existingVariant = experiment.variants.find(
      (v) => v.id === assignments[assignmentKey].variantId,
    );
    if (existingVariant) {
      return { variant: existingVariant, isNewAssignment: false, experiment };
    }
  }

  // Deterministically assign variant
  const assigned = assignVariant(experiment, effectiveUserId);
  saveAssignment({
    experimentId,
    variantId: assigned.id,
    userId: effectiveUserId,
    assignedAt: nowUTC(),
  });

  return { variant: assigned, isNewAssignment: true, experiment };
}

/**
 * Track an experiment metric event
 */
export function trackExperimentEvent(
  experimentId: string,
  variantId: string,
  event: "impression" | "start" | "submission" | "error",
  durationMs: number = 0,
): void {
  recordVariantMetric(experimentId, variantId, event, durationMs);
}

/**
 * Compute real-time experiment results, metrics, conversion lifts, and statistical significance
 */
export function computeExperimentResults(
  experimentId: string,
): ExperimentResults | null {
  const experiment = getExperimentById(experimentId);
  if (!experiment) return null;

  const controlVariant =
    experiment.variants.find((v) => v.isControl) || experiment.variants[0];
  const controlMetrics = getVariantMetrics(experiment.id, controlVariant.id);

  const variantStats: Record<string, VariantStatistics> = {};
  let totalParticipants = 0;
  let leadingVariantId: string | undefined;
  let maxConversionRate = -1;

  for (const variant of experiment.variants) {
    const metrics = getVariantMetrics(experiment.id, variant.id);
    totalParticipants += metrics.impressions;

    const trials = metrics.impressions;
    const conversions = metrics.submissions;

    const conversionRate = trials > 0 ? conversions / trials : 0;
    const startRate = trials > 0 ? metrics.starts / trials : 0;
    const errorRate = metrics.starts > 0 ? metrics.errors / metrics.starts : 0;
    const avgTimeToCompleteSeconds =
      conversions > 0
        ? Math.round(metrics.completedDurationMs / conversions / 1000)
        : 0;

    const ci95 = calculateConfidenceInterval95(conversions, trials);

    let zScore = 0;
    let pValue = 1;
    let liftVsControlPercent = 0;
    let isStatisticallySignificant = false;
    let confidenceLevel = 0;

    if (!variant.isControl && controlMetrics) {
      const zTest = calculateZTest(
        conversions,
        trials,
        controlMetrics.submissions,
        controlMetrics.impressions,
      );
      zScore = zTest.zScore;
      pValue = zTest.pValue;
      liftVsControlPercent = zTest.liftVsControlPercent;
      isStatisticallySignificant = zTest.isStatisticallySignificant;
      confidenceLevel = zTest.confidenceLevel;
    }

    if (conversionRate > maxConversionRate) {
      maxConversionRate = conversionRate;
      leadingVariantId = variant.id;
    }

    variantStats[variant.id] = {
      variantId: variant.id,
      variantName: variant.name,
      isControl: Boolean(variant.isControl),
      metrics,
      conversionRate: Math.round(conversionRate * 1000) / 1000,
      startRate: Math.round(startRate * 1000) / 1000,
      errorRate: Math.round(errorRate * 100) / 100,
      avgTimeToCompleteSeconds,
      conversionRateCI95: ci95,
      liftVsControlPercent,
      zScore,
      pValue,
      isStatisticallySignificant,
      confidenceLevel,
    };
  }

  const isConclusive = Object.values(variantStats).some(
    (s) => !s.isControl && s.isStatisticallySignificant,
  );

  const winnerVariant = experiment.winnerVariantId
    ? experiment.variants.find((v) => v.id === experiment.winnerVariantId)
    : undefined;

  return {
    experiment,
    variantStats,
    leadingVariantId,
    hasWinner: Boolean(experiment.winnerVariantId),
    winnerVariant,
    totalParticipants,
    isConclusive,
  };
}

/**
 * Declare a winning variant and optionally roll out to 100% of users
 */
export function declareWinner(
  experimentId: string,
  variantId: string,
  rolloutWinnerToAll: boolean = true,
): FormExperiment | null {
  const experiments = loadExperiments();
  const index = experiments.findIndex((e) => e.id === experimentId);
  if (index === -1) return null;

  const experiment = experiments[index];
  const variantExists = experiment.variants.some((v) => v.id === variantId);
  if (!variantExists) return null;

  experiment.winnerVariantId = variantId;
  experiment.rolloutWinnerToAll = rolloutWinnerToAll;
  experiment.status = "completed";
  experiment.endedAt = nowUTC();

  saveExperiments(experiments);
  return experiment;
}

/**
 * Create a new form variation experiment
 */
export function createExperiment(
  input: Omit<FormExperiment, "id" | "createdAt" | "status"> & {
    id?: string;
  },
): FormExperiment {
  const experiments = loadExperiments();
  const newExperiment: FormExperiment = {
    ...input,
    id: input.id || `exp_${generateId()}`,
    status: "running",
    createdAt: nowUTC(),
    startedAt: nowUTC(),
  };

  experiments.unshift(newExperiment);
  saveExperiments(experiments);
  return newExperiment;
}
