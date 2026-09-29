/**
 * Deduplication & Merge Engine
 */

import { evaluateCandidateSimilarity } from "./similarity";
import {
  recordMerge,
  getMergeRecord,
  markMergeRestored,
  loadMergeHistory,
} from "./store";
import type {
  DuplicateCheckQuery,
  DuplicateCheckResult,
  DuplicateCandidate,
  FieldMergeDecision,
  MergeSuggestion,
  MergeHistoryRecord,
  DeduplicationConfig,
} from "./types";
import type { Project } from "@/types/project";
import { projectService } from "@/services/project/project.service";
import { auditLogService } from "@/services/audit/audit-log.service";

export const DEFAULT_DEDUPLICATION_CONFIG: DeduplicationConfig = {
  exactThreshold: 0.95,
  likelyThreshold: 0.65,
  possibleThreshold: 0.40,
  preventExactSubmission: true,
  fuzzyNameMinLength: 3,
};

/**
 * Find potential and exact duplicates for a submission
 */
export function findDuplicates(
  query: DuplicateCheckQuery,
  existingProjects?: Project[],
  config: DeduplicationConfig = DEFAULT_DEDUPLICATION_CONFIG,
): DuplicateCheckResult {
  const projects = existingProjects || projectService.getAllProjects();
  const candidates: DuplicateCandidate[] = [];

  for (const existing of projects) {
    const candidate = evaluateCandidateSimilarity(query, existing);
    if (!candidate) continue;

    if (
      candidate.isExact ||
      candidate.overallSimilarity >= config.possibleThreshold
    ) {
      candidates.push(candidate);
    }
  }

  // Sort candidates by similarity descending (highest first)
  candidates.sort((a, b) => {
    if (a.isExact && !b.isExact) return -1;
    if (!a.isExact && b.isExact) return 1;
    return b.overallSimilarity - a.overallSimilarity;
  });

  const exactMatch = candidates.find((c) => c.isExact);
  const reasons: string[] = [];

  for (const candidate of candidates) {
    if (candidate.summaryReasons.length > 0) {
      reasons.push(
        `“${candidate.project.name}” (${Math.round(candidate.overallSimilarity * 100)}% match) — ${candidate.summaryReasons.join(", ")}`,
      );
    }
  }

  return {
    hasExactDuplicate: Boolean(exactMatch),
    hasPotentialDuplicates: candidates.length > 0,
    exactMatch,
    candidates,
    reasons,
  };
}

/**
 * Generate smart merge suggestions and field-level resolutions
 */
export function suggestMerge(
  target: Project,
  source: Project | Partial<Project>,
): MergeSuggestion {
  const decisions: FieldMergeDecision[] = [];

  // 1. Name: default to target, or source if target is generic
  const targetName = target.name || "";
  const sourceName = source.name || "";
  decisions.push({
    field: "name",
    strategy: "target",
    sourceValue: sourceName,
    targetValue: targetName,
    resolvedValue: targetName || sourceName,
    conflict: targetName.toLowerCase() !== sourceName.toLowerCase(),
  });

  // 2. Primary Category: target priority, fallback source
  const targetCategory = target.primaryCategory;
  const sourceCategory = source.primaryCategory;
  decisions.push({
    field: "primaryCategory",
    strategy: "target",
    sourceValue: sourceCategory,
    targetValue: targetCategory,
    resolvedValue: targetCategory || sourceCategory,
    conflict: targetCategory !== sourceCategory,
  });

  // 3. Description: choose the longer, more comprehensive description
  const targetDesc = target.description || "";
  const sourceDesc = source.description || "";
  const longerDesc = sourceDesc.length > targetDesc.length ? sourceDesc : targetDesc;
  decisions.push({
    field: "description",
    strategy: "longest",
    sourceValue: sourceDesc,
    targetValue: targetDesc,
    resolvedValue: longerDesc,
    conflict: targetDesc !== sourceDesc,
  });

  // 4. Tags: Combine array union (deduplicated)
  const targetTags = target.tags || [];
  const sourceTags = source.tags || [];
  const combinedTags = Array.from(
    new Set([...targetTags, ...sourceTags].map((t) => t.trim()).filter(Boolean)),
  );
  decisions.push({
    field: "tags",
    strategy: "combine_unique",
    sourceValue: sourceTags,
    targetValue: targetTags,
    resolvedValue: combinedTags,
    conflict: false,
  });

  // 5. Website URL: target priority, fallback source
  const targetWeb = target.websiteUrl || "";
  const sourceWeb = source.websiteUrl || "";
  decisions.push({
    field: "websiteUrl",
    strategy: "target",
    sourceValue: sourceWeb,
    targetValue: targetWeb,
    resolvedValue: targetWeb || sourceWeb,
    conflict: Boolean(targetWeb && sourceWeb && targetWeb !== sourceWeb),
  });

  // 6. GitHub URL: target priority, fallback source
  const targetGit = target.githubUrl || "";
  const sourceGit = source.githubUrl || "";
  decisions.push({
    field: "githubUrl",
    strategy: "target",
    sourceValue: sourceGit,
    targetValue: targetGit,
    resolvedValue: targetGit || sourceGit,
    conflict: Boolean(targetGit && sourceGit && targetGit !== sourceGit),
  });

  // 7. Contract Addresses: combine unique
  const targetContracts = target.contractAddresses || [];
  const sourceContracts = source.contractAddresses || [];
  const combinedContracts = Array.from(
    new Set([...targetContracts, ...sourceContracts].map((c) => c.trim().toUpperCase()).filter(Boolean)),
  );
  decisions.push({
    field: "contractAddresses",
    strategy: "combine_unique",
    sourceValue: sourceContracts,
    targetValue: targetContracts,
    resolvedValue: combinedContracts,
    conflict: false,
  });

  // 8. Supplementary URLs (docs, logo, audit, bounty)
  for (const urlField of [
    "logoUrl",
    "docsUrl",
    "auditReportUrl",
    "bugBountyUrl",
  ] as const) {
    const tVal = target[urlField] || "";
    const sVal = (source as any)[urlField] || "";
    decisions.push({
      field: urlField,
      strategy: tVal ? "target" : "source",
      sourceValue: sVal,
      targetValue: tVal,
      resolvedValue: tVal || sVal,
      conflict: Boolean(tVal && sVal && tVal !== sVal),
    });
  }

  // Construct proposed record
  const proposedRecord: Partial<Project> = {
    ...target,
  };
  for (const dec of decisions) {
    (proposedRecord as any)[dec.field] = dec.resolvedValue;
  }

  const conflictCount = decisions.filter((d) => d.conflict).length;

  return {
    targetProjectId: target.id,
    sourceProjectId: (source as Project).id || "incoming",
    targetProjectName: target.name,
    sourceProjectName: source.name || "Incoming Submission",
    proposedRecord,
    fieldDecisions: decisions,
    conflictCount,
  };
}

/**
 * Execute a merge between target and source project, saving snapshots for rollback
 */
export function executeMerge(params: {
  targetProject: Project;
  sourceProject: Project;
  customDecisions?: FieldMergeDecision[];
  mergedBy: string;
}): { success: boolean; record: MergeHistoryRecord; mergedProject: Project } {
  const { targetProject, sourceProject, customDecisions, mergedBy } = params;

  const suggestion = suggestMerge(targetProject, sourceProject);
  const activeDecisions = customDecisions || suggestion.fieldDecisions;

  // Build merged project
  const mergedProject: Project = {
    ...targetProject,
  };
  for (const decision of activeDecisions) {
    (mergedProject as any)[decision.field] = decision.resolvedValue;
  }

  // Record history snapshot before mutating
  const historyRecord = recordMerge({
    mergedBy,
    sourceProjectId: sourceProject.id,
    targetProjectId: targetProject.id,
    sourceProjectName: sourceProject.name,
    targetProjectName: targetProject.name,
    sourceSnapshot: JSON.parse(JSON.stringify(sourceProject)),
    targetSnapshot: JSON.parse(JSON.stringify(targetProject)),
    mergedSnapshot: JSON.parse(JSON.stringify(mergedProject)),
    fieldDecisions: activeDecisions,
  });

  // Track in audit log
  auditLogService.append({
    actor: mergedBy,
    action: "project_merged" as any,
    targetId: targetProject.id,
    targetLabel: `${sourceProject.name} -> ${targetProject.name}`,
    metadata: {
      mergeId: historyRecord.id,
      fieldsUpdated: activeDecisions.map((d) => d.field),
    },
  });

  return {
    success: true,
    record: historyRecord,
    mergedProject,
  };
}

/**
 * Restore a previously merged project from its snapshot
 */
export function restoreMerge(params: {
  mergeId: string;
  restoredBy: string;
  reason?: string;
}): {
  success: boolean;
  restoredRecord?: MergeHistoryRecord;
  error?: string;
} {
  const { mergeId, restoredBy, reason } = params;
  const record = getMergeRecord(mergeId);

  if (!record) {
    return { success: false, error: "Merge history record not found." };
  }

  if (record.status === "restored") {
    return {
      success: false,
      error: `This merge was already restored at ${record.restoredAt}.`,
    };
  }

  const updatedRecord = markMergeRestored(mergeId, restoredBy, reason);

  auditLogService.append({
    actor: restoredBy,
    action: "project_merge_restored" as any,
    targetId: record.targetProjectId,
    targetLabel: `Restored ${record.sourceProjectName} & ${record.targetProjectName}`,
    metadata: {
      mergeId,
      reason,
    },
  });

  return {
    success: true,
    restoredRecord: updatedRecord || undefined,
  };
}

/**
 * Query merge history
 */
export function getMergeHistory(): MergeHistoryRecord[] {
  return loadMergeHistory();
}
