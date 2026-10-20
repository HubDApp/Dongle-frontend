/**
 * Project health score (Issue #671).
 *
 * Aggregates five signals into a single 0–100 score:
 *
 *   Update recency        25%
 *   Review sentiment      25%
 *   Verification status   20%
 *   GitHub activity       15%  (only when a repository is linked)
 *   On-chain tx volume    15%  (only when contract addresses are listed)
 *
 * Factors that cannot be measured for a project are marked unavailable and
 * their weight is redistributed proportionally across the remaining factors,
 * so a project without a repository is not penalised as if it had a dead one.
 *
 * Everything here is pure — data gathering lives in `signals.ts`.
 */

import type { VerificationTier } from "@/types/project";

export type HealthFactorKey =
  | "updateRecency"
  | "reviewSentiment"
  | "verification"
  | "githubActivity"
  | "onChainVolume";

export type VerificationState = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export type HealthGrade = "excellent" | "good" | "fair" | "poor";

export const HEALTH_WEIGHTS: Record<HealthFactorKey, number> = {
  updateRecency: 0.25,
  reviewSentiment: 0.25,
  verification: 0.2,
  githubActivity: 0.15,
  onChainVolume: 0.15,
};

export const HEALTH_FACTOR_LABELS: Record<HealthFactorKey, string> = {
  updateRecency: "Update recency",
  reviewSentiment: "Review sentiment",
  verification: "Verification status",
  githubActivity: "GitHub activity",
  onChainVolume: "On-chain volume",
};

/** Days for the update-recency score to halve. */
export const UPDATE_HALF_LIFE_DAYS = 90;
/** Days for the repository-activity part of the GitHub score to halve. */
export const REPO_HALF_LIFE_DAYS = 60;
/** Prior strength (in reviews) pulling sparse ratings toward neutral. */
export const SENTIMENT_PRIOR_REVIEWS = 5;
/** Neutral rating used as the Bayesian prior. */
export const SENTIMENT_PRIOR_RATING = 3;
/** Stars at which repository popularity saturates. */
export const STAR_SATURATION = 1000;
/** Transactions in the trailing 30 days at which volume saturates. */
export const TX_SATURATION = 1000;

const MS_PER_DAY = 86_400_000;

export interface HealthInput {
  /** ISO timestamp of the most recent project update; falls back to `createdAt`. */
  lastUpdateAt?: string | null;
  createdAt: string;
  /** Average rating on a 1–5 scale. */
  rating: number;
  reviewCount: number;
  verificationStatus?: VerificationState | null;
  verificationTier?: VerificationTier;
  /** Repository signals; `null`/absent when no repository is linked or loaded. */
  repository?: { lastUpdate?: string; stars?: number; forks?: number } | null;
  /** Distinct transactions in the trailing 30 days; `null` when the project lists no contracts. */
  txCount30d?: number | null;
  now?: Date;
}

export interface HealthFactor {
  key: HealthFactorKey;
  label: string;
  /** 0–100, or null when unavailable. */
  score: number | null;
  /** Nominal weight from the spec (0–1). */
  weight: number;
  /** Weight actually applied after redistribution (0–1); 0 when unavailable. */
  effectiveWeight: number;
  available: boolean;
  /** Short human-readable explanation of the input behind the score. */
  detail: string;
}

export interface ProjectHealth {
  score: number;
  grade: HealthGrade;
  factors: HealthFactor[];
  /** True when at least one factor was unavailable and weights were redistributed. */
  redistributed: boolean;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(fromIso: string, now: Date): number | null {
  const t = new Date(fromIso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (now.getTime() - t) / MS_PER_DAY);
}

function decay(days: number, halfLife: number): number {
  return 100 * Math.pow(0.5, days / halfLife);
}

function logScale(value: number, saturation: number): number {
  if (value <= 0) return 0;
  return clamp((Math.log10(value + 1) / Math.log10(saturation + 1)) * 100);
}

type FactorResult = { score: number | null; detail: string };

export function scoreUpdateRecency(input: HealthInput, now: Date): FactorResult {
  const source = input.lastUpdateAt || input.createdAt;
  const days = daysBetween(source, now);
  if (days === null) return { score: null, detail: "No update history" };
  const rounded = Math.round(days);
  const label = input.lastUpdateAt ? "Last update" : "Listed";
  return {
    score: clamp(decay(days, UPDATE_HALF_LIFE_DAYS)),
    detail: `${label} ${rounded} day${rounded === 1 ? "" : "s"} ago`,
  };
}

/**
 * Bayesian average so one 5★ review does not outrank fifty 4.8★ reviews:
 * sparse ratings are pulled toward a neutral 3★ prior.
 */
export function scoreReviewSentiment(input: HealthInput): FactorResult {
  const n = Math.max(0, input.reviewCount || 0);
  const rating = clamp(input.rating || 0, 0, 5);
  const adjusted =
    (rating * n + SENTIMENT_PRIOR_RATING * SENTIMENT_PRIOR_REVIEWS) / (n + SENTIMENT_PRIOR_REVIEWS);
  return {
    score: clamp(((adjusted - 1) / 4) * 100),
    detail:
      n === 0
        ? "No reviews yet (neutral)"
        : `${rating.toFixed(1)}★ across ${n} review${n === 1 ? "" : "s"}`,
  };
}

const TIER_BONUS: Record<VerificationTier, number> = { BRONZE: 5, SILVER: 10, GOLD: 15 };

export function scoreVerification(input: HealthInput): FactorResult {
  switch (input.verificationStatus ?? "NONE") {
    case "VERIFIED": {
      const bonus = input.verificationTier ? TIER_BONUS[input.verificationTier] : 0;
      const tier = input.verificationTier ? ` (${input.verificationTier.toLowerCase()})` : "";
      return { score: 85 + bonus, detail: `Verified${tier}` };
    }
    case "PENDING":
      return { score: 50, detail: "Verification pending" };
    case "REJECTED":
      return { score: 0, detail: "Verification rejected" };
    default:
      return { score: 25, detail: "Not verified" };
  }
}

/** 70% commit recency + 30% popularity (stars + forks, log-scaled). */
export function scoreGithubActivity(input: HealthInput, now: Date): FactorResult {
  const repo = input.repository;
  if (!repo) return { score: null, detail: "No repository linked" };

  const days = repo.lastUpdate ? daysBetween(repo.lastUpdate, now) : null;
  const popularity = logScale((repo.stars ?? 0) + (repo.forks ?? 0), STAR_SATURATION);
  if (days === null && repo.stars === undefined && repo.forks === undefined) {
    return { score: null, detail: "Repository data unavailable" };
  }

  const recency = days === null ? 0 : decay(days, REPO_HALF_LIFE_DAYS);
  const parts = [
    days === null ? "no recent activity data" : `pushed ${Math.round(days)}d ago`,
    `${repo.stars ?? 0}★`,
  ];
  return { score: clamp(recency * 0.7 + popularity * 0.3), detail: parts.join(", ") };
}

export function scoreOnChainVolume(input: HealthInput): FactorResult {
  if (input.txCount30d === null || input.txCount30d === undefined) {
    return { score: null, detail: "No contracts listed" };
  }
  const n = Math.max(0, Math.floor(input.txCount30d));
  return {
    score: logScale(n, TX_SATURATION),
    detail: `${n} transaction${n === 1 ? "" : "s"} in 30 days`,
  };
}

export function gradeFor(score: number): HealthGrade {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

export const HEALTH_GRADE_LABELS: Record<HealthGrade, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export function computeHealthScore(input: HealthInput): ProjectHealth {
  const now = input.now ?? new Date();
  const raw: Record<HealthFactorKey, FactorResult> = {
    updateRecency: scoreUpdateRecency(input, now),
    reviewSentiment: scoreReviewSentiment(input),
    verification: scoreVerification(input),
    githubActivity: scoreGithubActivity(input, now),
    onChainVolume: scoreOnChainVolume(input),
  };

  const keys = Object.keys(HEALTH_WEIGHTS) as HealthFactorKey[];
  const availableWeight = keys.reduce(
    (sum, k) => (raw[k].score === null ? sum : sum + HEALTH_WEIGHTS[k]),
    0,
  );

  const factors: HealthFactor[] = keys.map((key) => {
    const { score, detail } = raw[key];
    const available = score !== null;
    return {
      key,
      label: HEALTH_FACTOR_LABELS[key],
      score: available ? Math.round(score) : null,
      weight: HEALTH_WEIGHTS[key],
      effectiveWeight: available && availableWeight > 0 ? HEALTH_WEIGHTS[key] / availableWeight : 0,
      available,
      detail,
    };
  });

  const total = keys.reduce((sum, key, i) => {
    const s = raw[key].score;
    return s === null ? sum : sum + s * factors[i].effectiveWeight;
  }, 0);

  const score = Math.round(clamp(total));
  return {
    score,
    grade: gradeFor(score),
    factors,
    redistributed: factors.some((f) => !f.available),
  };
}
