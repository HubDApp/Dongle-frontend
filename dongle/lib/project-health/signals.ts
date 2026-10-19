/**
 * Gathers health signals for a project from the app's existing data sources
 * and feeds them to the pure scorer.
 */

import type { Project } from "@/types/project";
import type { ProjectUpdate } from "@/types/update";
import { updateService } from "@/services/update/update.service";
import { queryEvents } from "@/services/indexer/event-store.service";
import { computeHealthScore, type ProjectHealth, type VerificationState } from "./score";

const TX_WINDOW_MS = 30 * 86_400_000;
/** Upper bound on events scanned per contract when counting volume. */
const MAX_EVENTS_PER_CONTRACT = 5000;

export interface HealthOverrides {
  verificationStatus?: VerificationState | null;
  /** Live updates, when the caller already has them loaded. */
  updates?: ProjectUpdate[];
  /** Live rating/review count, when the caller has fresher data than the project record. */
  rating?: number;
  reviewCount?: number;
  now?: Date;
}

function latestUpdateAt(updates: ProjectUpdate[]): string | null {
  let latest: number | null = null;
  for (const u of updates) {
    const t = new Date(u.publishedAt).getTime();
    if (Number.isFinite(t) && (latest === null || t > latest)) latest = t;
  }
  return latest === null ? null : new Date(latest).toISOString();
}

/**
 * Distinct transactions touching the project's contracts in the trailing 30
 * days, or null when the project lists no contracts (factor unavailable).
 */
export function countRecentTransactions(project: Project, now: Date = new Date()): number | null {
  const contracts = (project.contractAddresses ?? []).filter((c) => c.trim().length > 0);
  if (contracts.length === 0) return null;

  const cutoff = now.getTime() - TX_WINDOW_MS;
  const hashes = new Set<string>();
  for (const contractId of contracts) {
    const { events } = queryEvents({ contractId, limit: MAX_EVENTS_PER_CONTRACT });
    for (const e of events) {
      if (new Date(e.indexedAt).getTime() >= cutoff) hashes.add(e.txHash);
    }
  }
  return hashes.size;
}

export function getProjectHealth(project: Project, overrides: HealthOverrides = {}): ProjectHealth {
  const now = overrides.now ?? new Date();
  const updates = overrides.updates ?? updateService.getUpdatesByProject(project.id);
  const repoLinked = Boolean(project.githubUrl || project.repositoryMetadata);

  return computeHealthScore({
    lastUpdateAt: latestUpdateAt(updates),
    createdAt: project.createdAt,
    rating: overrides.rating ?? project.rating,
    reviewCount: overrides.reviewCount ?? project.reviews,
    verificationStatus: overrides.verificationStatus,
    verificationTier: project.verificationTier,
    repository: repoLinked ? project.repositoryMetadata ?? null : null,
    txCount30d: countRecentTransactions(project, now),
    now,
  });
}
