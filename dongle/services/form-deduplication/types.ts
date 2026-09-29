/**
 * Types for Form Deduplication and Merge System
 */

import type { Project } from "@/types/project";

export type MatchSeverity = "exact" | "likely" | "possible";

export interface DuplicateFieldMatch {
  field: string;
  sourceValue: unknown;
  existingValue: unknown;
  similarity: number; // 0 to 1
  reason: string;
}

export interface DuplicateCandidate {
  project: Project;
  overallSimilarity: number; // 0 to 1 (0% to 100%)
  severity: MatchSeverity;
  isExact: boolean;
  fieldMatches: DuplicateFieldMatch[];
  summaryReasons: string[];
}

export interface DuplicateCheckQuery {
  id?: string;
  name: string;
  websiteUrl?: string;
  githubUrl?: string;
  contractAddresses?: string[];
  description?: string;
  primaryCategory?: string;
  tags?: string[];
  ownerAddress?: string;
}

export interface DuplicateCheckResult {
  hasExactDuplicate: boolean;
  hasPotentialDuplicates: boolean;
  exactMatch?: DuplicateCandidate;
  candidates: DuplicateCandidate[];
  reasons: string[];
}

export type MergeResolutionStrategy =
  | "source" // use incoming/source value
  | "target" // use existing/target value
  | "newest" // use newest timestamp
  | "longest" // use longest text (e.g. description)
  | "combine_unique" // union array items (e.g. tags, contractAddresses)
  | "custom"; // manually supplied custom value

export interface FieldMergeDecision {
  field: string;
  strategy: MergeResolutionStrategy;
  sourceValue: unknown;
  targetValue: unknown;
  resolvedValue: unknown;
  conflict: boolean;
}

export interface MergeSuggestion {
  targetProjectId: string;
  sourceProjectId: string;
  targetProjectName: string;
  sourceProjectName: string;
  proposedRecord: Partial<Project>;
  fieldDecisions: FieldMergeDecision[];
  conflictCount: number;
}

export interface MergeHistoryRecord {
  id: string;
  timestamp: string; // ISO date
  mergedBy: string; // admin or user address
  sourceProjectId: string;
  targetProjectId: string;
  sourceProjectName: string;
  targetProjectName: string;
  sourceSnapshot: Project;
  targetSnapshot: Project;
  mergedSnapshot: Project;
  fieldDecisions: FieldMergeDecision[];
  status: "active" | "restored";
  restoredAt?: string;
  restoredBy?: string;
  restoreReason?: string;
}

export interface DeduplicationConfig {
  exactThreshold: number; // default 0.98
  likelyThreshold: number; // default 0.70
  possibleThreshold: number; // default 0.45
  preventExactSubmission: boolean; // default true
  fuzzyNameMinLength: number; // default 3
}
