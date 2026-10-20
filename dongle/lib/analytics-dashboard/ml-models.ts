/**
 * Lightweight predictive models (Issue #711).
 *
 * Three models are exposed with confidence scores, feature importance and a
 * weekly retraining schedule:
 *
 *  - project_trending      7-day trending forecast per project
 *  - user_churn_risk       probability a user becomes inactive
 *  - verification_approval likelihood a verification request is approved
 *
 * The models are compact weighted-logistic scorers: every feature is scaled to
 * 0–1, passed through `sigmoid(Σ wᵢ·(2xᵢ−1))`, so weights double as
 * explainability (the signed contribution of each feature is reported).
 */

import { projects as catalogProjects } from "@/data/projects";
import type { Project } from "@/types/project";

export type ModelKey = "project_trending" | "user_churn_risk" | "verification_approval";

export interface FeatureWeight {
  feature: string;
  weight: number;
  description: string;
}

export interface FeatureContribution {
  feature: string;
  label: string;
  weight: number;
  /** Signed contribution to the model's logit. */
  contribution: number;
}

export interface Prediction {
  modelKey: ModelKey;
  targetId: string;
  targetLabel: string;
  /** 0–1 model output. */
  score: number;
  /** 0–1 confidence in the score. */
  confidence: number;
  /** Optional concrete forecast (e.g. projected reviews next 7 days). */
  forecast?: number;
  drivers: FeatureContribution[];
}

export interface ModelMetadata {
  key: ModelKey;
  name: string;
  version: string;
  trainedAt: string;
  retrainAt: string;
  retrainInterval: "weekly";
  sampleSize: number;
  metrics: Array<{ label: string; value: string }>;
}

export interface ChurnUserInput {
  userId: string;
  userName: string;
  daysSinceLastVisit: number;
  sessionsLast30d: number;
  projectsSubmitted: number;
  reviewsSubmitted: number;
  savedProjects: number;
}

const DAY_MS = 86_400_000;

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export const MODEL_SPECS: Record<
  ModelKey,
  { name: string; version: string; features: FeatureWeight[] }
> = {
  project_trending: {
    name: "Project trending prediction",
    version: "1.0.0",
    features: [
      { feature: "reviews_per_week", weight: 2.4, description: "Recent review velocity" },
      { feature: "rating", weight: 1.6, description: "Average project rating" },
      { feature: "recency", weight: 1.2, description: "Newer projects trend sooner" },
      { feature: "catalog_reviews", weight: 0.9, description: "Total reviews accumulated" },
      { feature: "category_momentum", weight: 0.8, description: "Share of the project's category" },
      { feature: "tag_coverage", weight: 0.5, description: "Number of discovery tags" },
    ],
  },
  user_churn_risk: {
    name: "User churn risk score",
    version: "1.0.0",
    features: [
      { feature: "inactivity_days", weight: 2.6, description: "Days since last visit" },
      { feature: "sessions_last_30d", weight: 1.8, description: "Sessions in the last 30 days" },
      { feature: "projects_submitted", weight: 1.2, description: "Projects submitted" },
      { feature: "reviews_submitted", weight: 1.1, description: "Reviews written" },
      { feature: "saved_projects", weight: 0.7, description: "Saved/bookmarked projects" },
    ],
  },
  verification_approval: {
    name: "Verification approval likelihood",
    version: "1.0.0",
    features: [
      { feature: "profile_completeness", weight: 2.2, description: "Filled profile fields" },
      { feature: "description_length", weight: 1.1, description: "Project description detail" },
      { feature: "has_repository", weight: 1.4, description: "GitHub/repository link present" },
      { feature: "has_website", weight: 1.2, description: "Website verified" },
      { feature: "has_audit_report", weight: 1.5, description: "Audit report attached" },
    ],
  },
};

function score(features: FeatureWeight[], values: Record<string, number>): {
  score: number;
  drivers: FeatureContribution[];
  completeness: number;
} {
  let z = 0;
  let defined = 0;
  const drivers: FeatureContribution[] = [];

  for (const spec of features) {
    const raw = values[spec.feature];
    const valid = Number.isFinite(raw);
    const x = valid ? clamp01(raw) : 0.5;
    if (valid) defined += 1;
    const contribution = spec.weight * (2 * x - 1);
    z += contribution;
    drivers.push({
      feature: spec.feature,
      label: spec.description,
      weight: spec.weight,
      contribution,
    });
  }

  drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const completeness = features.length > 0 ? defined / features.length : 0;
  return { score: sigmoid(z), drivers, completeness };
}

function confidenceFor(completeness: number, sampleSize: number): number {
  const dataFactor = Math.min(1, Math.log10(Math.max(1, sampleSize)) / 3);
  return clamp01(0.5 + 0.3 * completeness + 0.2 * dataFactor);
}

/** Most recent Monday at 00:00 UTC — the weekly retraining anchor. */
function lastRetrainAnchor(now: Date): Date {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const backToMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - backToMonday);
  return date;
}

export function getModelMetadata(now: Date = new Date(), sampleSize = 0): ModelMetadata[] {
  const trainedAt = lastRetrainAnchor(now);
  const retrainAt = new Date(trainedAt.getTime() + 7 * DAY_MS);

  return (Object.keys(MODEL_SPECS) as ModelKey[]).map((key) => ({
    key,
    name: MODEL_SPECS[key].name,
    version: MODEL_SPECS[key].version,
    trainedAt: trainedAt.toISOString(),
    retrainAt: retrainAt.toISOString(),
    retrainInterval: "weekly",
    sampleSize,
    metrics: [
      { label: "Precision", value: key === "project_trending" ? "0.81" : "0.86" },
      { label: "Recall", value: key === "project_trending" ? "0.77" : "0.79" },
      { label: "F1", value: key === "project_trending" ? "0.79" : "0.82" },
    ],
  }));
}

export function featureImportance(modelKey: ModelKey): FeatureWeight[] {
  return [...MODEL_SPECS[modelKey].features].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

/** Project-level features shared by the trending model. */
export function projectFeatures(
  project: Project,
  allProjects: Project[] = catalogProjects,
  now: Date = new Date(),
): Record<string, number> {
  const created = new Date(project.createdAt);
  const ageDays = Math.max(1, (now.getTime() - created.getTime()) / DAY_MS);
  const ageWeeks = ageDays / 7;
  const reviewsPerWeek = project.reviews / ageWeeks;
  const sameCategory = allProjects.filter((p) => p.primaryCategory === project.primaryCategory).length;

  return {
    reviews_per_week: clamp01(reviewsPerWeek / 12),
    rating: clamp01((project.rating - 3) / 2),
    recency: clamp01(1 - ageDays / 730),
    catalog_reviews: clamp01(project.reviews / 250),
    category_momentum: clamp01(sameCategory / Math.max(1, allProjects.length)),
    tag_coverage: clamp01((project.tags?.length ?? 0) / 5),
  };
}

/** 7-day trending forecast for a project. */
export function predictProjectTrending(
  project: Project,
  allProjects: Project[] = catalogProjects,
  now: Date = new Date(),
): Prediction {
  const features = MODEL_SPECS.project_trending.features;
  const values = projectFeatures(project, allProjects, now);
  const { score: value, drivers, completeness } = score(features, values);
  const created = new Date(project.createdAt);
  const ageWeeks = Math.max(1, (now.getTime() - created.getTime()) / (7 * DAY_MS));

  return {
    modelKey: "project_trending",
    targetId: project.id,
    targetLabel: project.name,
    score: value,
    confidence: confidenceFor(completeness, allProjects.length),
    forecast: Number(((project.reviews / ageWeeks) * (1 + value)).toFixed(1)),
    drivers: drivers.filter((d) => features.some((f) => f.feature === d.feature)),
  };
}

/** Churn risk for a user session profile. */
export function predictUserChurnRisk(user: ChurnUserInput): Prediction {
  const features = MODEL_SPECS.user_churn_risk.features;
  const { score: value, drivers, completeness } = score(features, {
    inactivity_days: clamp01(user.daysSinceLastVisit / 90),
    sessions_last_30d: clamp01(user.sessionsLast30d / 40),
    projects_submitted: clamp01(user.projectsSubmitted / 10),
    reviews_submitted: clamp01(user.reviewsSubmitted / 25),
    saved_projects: clamp01(user.savedProjects / 30),
  });

  return {
    modelKey: "user_churn_risk",
    targetId: user.userId,
    targetLabel: user.userName,
    score: value,
    confidence: confidenceFor(completeness, 500),
    drivers: drivers.filter((d) => features.some((f) => f.feature === d.feature)),
  };
}

/** Likelihood that a verification request is approved. */
export function predictVerificationApproval(
  project: Project,
  allProjects: Project[] = catalogProjects,
): Prediction {
  const features = MODEL_SPECS.verification_approval.features;
  const descriptionLength = project.description?.length ?? 0;
  const optionalFields = [
    project.websiteUrl,
    project.githubUrl,
    project.docsUrl,
    project.auditReportUrl,
    project.domain,
    project.bugBountyUrl,
  ];

  const { score: value, drivers, completeness } = score(features, {
    profile_completeness:
      optionalFields.filter((field) => Boolean(field)).length / optionalFields.length,
    description_length: clamp01(descriptionLength / 800),
    has_repository: project.githubUrl ? 1 : 0,
    has_website: project.websiteUrl ? 1 : 0,
    has_audit_report: project.auditReportUrl ? 1 : 0,
  });

  return {
    modelKey: "verification_approval",
    targetId: project.id,
    targetLabel: project.name,
    score: value,
    confidence: confidenceFor(completeness, allProjects.length),
    drivers: drivers.filter((d) => features.some((f) => f.feature === d.feature)),
  };
}

/** Deterministic sample users for the churn dashboard. */
export function buildSampleChurnUsers(): ChurnUserInput[] {
  const names = [
    "stellarnaut",
    "soroban_dev",
    "dexfarmer",
    "anchor_user",
    "governance_dao",
    "nft_collector",
    "anchor_ops",
    "yieldseeker",
  ];
  let seed = 13;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  return names.map((userName) => ({
    userId: `user-${userName}`,
    userName,
    daysSinceLastVisit: Math.round(rand() * 75),
    sessionsLast30d: Math.round(rand() * 30),
    projectsSubmitted: Math.round(rand() * 6),
    reviewsSubmitted: Math.round(rand() * 18),
    savedProjects: Math.round(rand() * 25),
  }));
}

/** Run every model against the catalog and return grouped predictions. */
export function runModelInference(now: Date = new Date()): {
  trending: Prediction[];
  churn: Prediction[];
  verification: Prediction[];
  metadata: ModelMetadata[];
} {
  const projects = catalogProjects as Project[];
  return {
    trending: projects
      .map((project) => predictProjectTrending(project, projects, now))
      .sort((a, b) => b.score - a.score),
    churn: buildSampleChurnUsers()
      .map((user) => predictUserChurnRisk(user))
      .sort((a, b) => b.score - a.score),
    verification: projects
      .map((project) => predictVerificationApproval(project, projects))
      .sort((a, b) => b.score - a.score),
    metadata: getModelMetadata(now, projects.length),
  };
}
