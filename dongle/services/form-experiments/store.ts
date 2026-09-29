/**
 * Persistent Storage for Form Experiments, Metrics, and User Assignments
 */

import { generateId } from "@/lib/id-generator";
import { nowUTC } from "@/lib/date";
import type {
  FormExperiment,
  VariantMetric,
  UserExperimentAssignment,
} from "./types";

const EXPERIMENTS_STORAGE_KEY = "dongle_form_experiments";
const METRICS_STORAGE_KEY = "dongle_form_experiment_metrics";
const ASSIGNMENTS_STORAGE_KEY = "dongle_form_experiment_assignments";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

const DEFAULT_EXPERIMENTS: FormExperiment[] = [
  {
    id: "project-submission-v2",
    name: "Submission Form Experience Test",
    formId: "project-submit",
    status: "running",
    minSampleSize: 30,
    primaryMetric: "conversion_rate",
    createdAt: "2026-03-01T00:00:00Z",
    startedAt: "2026-03-01T00:00:00Z",
    variants: [
      {
        id: "control",
        name: "Standard Full Form",
        description: "Original single-page comprehensive project registration form",
        weight: 50,
        isControl: true,
      },
      {
        id: "variant_guided_steps",
        name: "Guided Step-by-Step",
        description: "Multi-step flow with progress bar, instant validation, and field suggestions",
        weight: 50,
        isControl: false,
      },
    ],
  },
];

// Pre-seeded sample metrics to demonstrate statistical significance in the dashboard
const INITIAL_SAMPLE_METRICS: Record<string, Record<string, VariantMetric>> = {
  "project-submission-v2": {
    control: {
      impressions: 120,
      starts: 95,
      submissions: 42,
      errors: 18,
      totalDurationMs: 120 * 45000,
      completedDurationMs: 42 * 68000,
    },
    variant_guided_steps: {
      impressions: 125,
      starts: 110,
      submissions: 68,
      errors: 9,
      totalDurationMs: 125 * 38000,
      completedDurationMs: 68 * 42000,
    },
  },
};

/**
 * Load all experiments
 */
export function loadExperiments(): FormExperiment[] {
  if (!isBrowser()) return DEFAULT_EXPERIMENTS;
  try {
    const raw = localStorage.getItem(EXPERIMENTS_STORAGE_KEY);
    if (!raw) {
      saveExperiments(DEFAULT_EXPERIMENTS);
      return DEFAULT_EXPERIMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EXPERIMENTS;
  } catch {
    return DEFAULT_EXPERIMENTS;
  }
}

/**
 * Save experiments list
 */
export function saveExperiments(experiments: FormExperiment[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(EXPERIMENTS_STORAGE_KEY, JSON.stringify(experiments));
  } catch (error) {
    console.error("[ExperimentStore] Failed to save experiments:", error);
  }
}

/**
 * Get an experiment by ID
 */
export function getExperimentById(experimentId: string): FormExperiment | null {
  const experiments = loadExperiments();
  return experiments.find((e) => e.id === experimentId) ?? null;
}

/**
 * Load all metrics
 */
export function loadMetrics(): Record<string, Record<string, VariantMetric>> {
  if (!isBrowser()) return INITIAL_SAMPLE_METRICS;
  try {
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) {
      saveMetrics(INITIAL_SAMPLE_METRICS);
      return INITIAL_SAMPLE_METRICS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SAMPLE_METRICS;
  }
}

/**
 * Save all metrics
 */
export function saveMetrics(
  metrics: Record<string, Record<string, VariantMetric>>,
): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
  } catch (error) {
    console.error("[ExperimentStore] Failed to save metrics:", error);
  }
}

/**
 * Get metrics for a specific experiment and variant
 */
export function getVariantMetrics(
  experimentId: string,
  variantId: string,
): VariantMetric {
  const all = loadMetrics();
  return (
    all[experimentId]?.[variantId] ?? {
      impressions: 0,
      starts: 0,
      submissions: 0,
      errors: 0,
      totalDurationMs: 0,
      completedDurationMs: 0,
    }
  );
}

/**
 * Record a metric event for an experiment variant
 */
export function recordVariantMetric(
  experimentId: string,
  variantId: string,
  event: "impression" | "start" | "submission" | "error",
  durationMs: number = 0,
): VariantMetric {
  const all = loadMetrics();
  if (!all[experimentId]) {
    all[experimentId] = {};
  }
  if (!all[experimentId][variantId]) {
    all[experimentId][variantId] = {
      impressions: 0,
      starts: 0,
      submissions: 0,
      errors: 0,
      totalDurationMs: 0,
      completedDurationMs: 0,
    };
  }

  const metric = all[experimentId][variantId];
  if (event === "impression") metric.impressions++;
  if (event === "start") metric.starts++;
  if (event === "error") metric.errors++;
  if (event === "submission") {
    metric.submissions++;
    metric.completedDurationMs += durationMs;
  }
  metric.totalDurationMs += durationMs;

  saveMetrics(all);
  return metric;
}

/**
 * Load user assignments
 */
export function loadAssignments(): Record<string, UserExperimentAssignment> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save a user assignment
 */
export function saveAssignment(assignment: UserExperimentAssignment): void {
  if (!isBrowser()) return;
  try {
    const all = loadAssignments();
    const key = `${assignment.experimentId}:${assignment.userId}`;
    all[key] = assignment;
    localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(all));
  } catch (error) {
    console.error("[ExperimentStore] Failed to save assignment:", error);
  }
}
