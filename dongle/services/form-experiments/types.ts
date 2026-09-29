/**
 * Types for Form Experimentation & A/B Testing System
 */

export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

export type ExperimentEventType =
  | "impression"
  | "start"
  | "field_blur"
  | "validation_error"
  | "submission"
  | "abandon";

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // e.g. 50 for 50%
  isControl: boolean;
  payload?: Record<string, unknown>;
}

export interface FormExperiment {
  id: string;
  name: string;
  formId: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  winnerVariantId?: string;
  rolloutWinnerToAll?: boolean;
  minSampleSize: number;
  primaryMetric: "conversion_rate" | "completion_rate";
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface VariantMetric {
  impressions: number;
  starts: number;
  submissions: number;
  errors: number;
  totalDurationMs: number;
  completedDurationMs: number;
}

export interface VariantStatistics {
  variantId: string;
  variantName: string;
  isControl: boolean;
  metrics: VariantMetric;
  conversionRate: number; // 0 to 1
  startRate: number; // 0 to 1
  errorRate: number; // errors per start
  avgTimeToCompleteSeconds: number;
  conversionRateCI95: [number, number]; // [lower, upper] 95% confidence interval
  liftVsControlPercent: number; // percentage lift over control
  zScore: number;
  pValue: number;
  isStatisticallySignificant: boolean; // p < 0.05
  confidenceLevel: number; // e.g. 95%
}

export interface ExperimentResults {
  experiment: FormExperiment;
  variantStats: Record<string, VariantStatistics>;
  leadingVariantId?: string;
  hasWinner: boolean;
  winnerVariant?: ExperimentVariant;
  totalParticipants: number;
  isConclusive: boolean;
}

export interface UserExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: string;
  userId: string;
}
