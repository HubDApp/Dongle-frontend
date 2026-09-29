/**
 * Similarity Algorithms and Comparison Helpers for Deduplication
 */

import { extractDomain } from "@/lib/url";
import { normalizeRepositoryUrl } from "@/lib/repository";
import type {
  DuplicateCheckQuery,
  DuplicateCandidate,
  DuplicateFieldMatch,
  MatchSeverity,
} from "./types";
import type { Project } from "@/types/project";

/**
 * Clean and normalize a string for comparison
 */
export function normalizeString(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Standard Levenshtein distance calculation
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalized Levenshtein similarity between 0 and 1
 */
export function levenshteinSimilarity(a?: string | null, b?: string | null): number {
  const normA = normalizeString(a);
  const normB = normalizeString(b);

  if (!normA && !normB) return 1;
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;

  const dist = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Jaccard similarity between two token arrays
 */
export function jaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (!tokensA.length && !tokensB.length) return 1;
  if (!tokensA.length || !tokensB.length) return 0;

  const setA = new Set(tokensA.map((t) => t.toLowerCase().trim()));
  const setB = new Set(tokensB.map((t) => t.toLowerCase().trim()));

  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionSize++;
    }
  }

  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Normalize website domain for comparison
 */
export function normalizeDomain(urlOrDomain?: string | null): string {
  if (!urlOrDomain) return "";
  try {
    const domain = extractDomain(urlOrDomain);
    return domain.toLowerCase().replace(/^www\./, "").trim();
  } catch {
    return urlOrDomain.toLowerCase().replace(/^www\./, "").trim();
  }
}

/**
 * Normalize repository URL (e.g. github.com/user/repo)
 */
export function normalizeRepo(url?: string | null): string {
  if (!url) return "";
  try {
    const normalized = normalizeRepositoryUrl(url);
    return normalized
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Compare Soroban contract addresses
 */
export function compareContractAddresses(
  contractsA: string[] = [],
  contractsB: string[] = [],
): { similarity: number; common: string[] } {
  const cleanA = contractsA.map((c) => c.trim().toUpperCase()).filter(Boolean);
  const cleanB = contractsB.map((c) => c.trim().toUpperCase()).filter(Boolean);

  if (cleanA.length === 0 || cleanB.length === 0) {
    return { similarity: 0, common: [] };
  }

  const setB = new Set(cleanB);
  const common = cleanA.filter((c) => setB.has(c));

  const similarity = jaccardSimilarity(cleanA, cleanB);
  return { similarity, common };
}

/**
 * Evaluate similarity between a query and an existing project
 */
export function evaluateCandidateSimilarity(
  query: DuplicateCheckQuery,
  existing: Project,
): DuplicateCandidate | null {
  // If comparing to same project ID, skip
  if (query.id && existing.id === query.id) {
    return null;
  }

  const fieldMatches: DuplicateFieldMatch[] = [];
  const summaryReasons: string[] = [];

  // 1. Name comparison
  const nameSim = levenshteinSimilarity(query.name, existing.name);
  if (nameSim >= 0.7) {
    fieldMatches.push({
      field: "name",
      sourceValue: query.name,
      existingValue: existing.name,
      similarity: nameSim,
      reason: nameSim === 1 ? "Identical project name" : `Similar name (${Math.round(nameSim * 100)}%)`,
    });
    summaryReasons.push(
      nameSim === 1 ? "Identical name" : `Very similar name (${Math.round(nameSim * 100)}%)`,
    );
  }

  // 2. Website / Domain comparison
  const queryDomain = normalizeDomain(query.websiteUrl);
  const existingDomain = normalizeDomain(existing.websiteUrl || existing.domain);
  let domainSim = 0;
  if (queryDomain && existingDomain) {
    if (queryDomain === existingDomain) {
      domainSim = 1.0;
      fieldMatches.push({
        field: "websiteUrl",
        sourceValue: query.websiteUrl,
        existingValue: existing.websiteUrl || existing.domain,
        similarity: 1.0,
        reason: `Identical domain (${queryDomain})`,
      });
      summaryReasons.push(`Exact website domain (${queryDomain})`);
    } else {
      domainSim = levenshteinSimilarity(queryDomain, existingDomain);
      if (domainSim >= 0.8) {
        fieldMatches.push({
          field: "websiteUrl",
          sourceValue: query.websiteUrl,
          existingValue: existing.websiteUrl || existing.domain,
          similarity: domainSim,
          reason: `Similar domain (${queryDomain} ~ ${existingDomain})`,
        });
        summaryReasons.push("Similar website domain");
      }
    }
  }

  // 3. GitHub repository comparison
  const queryRepo = normalizeRepo(query.githubUrl);
  const existingRepo = normalizeRepo(existing.githubUrl);
  let repoSim = 0;
  if (queryRepo && existingRepo) {
    if (queryRepo === existingRepo) {
      repoSim = 1.0;
      fieldMatches.push({
        field: "githubUrl",
        sourceValue: query.githubUrl,
        existingValue: existing.githubUrl,
        similarity: 1.0,
        reason: `Identical repository (${queryRepo})`,
      });
      summaryReasons.push(`Exact repository match (${queryRepo})`);
    } else {
      repoSim = levenshteinSimilarity(queryRepo, existingRepo);
      if (repoSim >= 0.8) {
        fieldMatches.push({
          field: "githubUrl",
          sourceValue: query.githubUrl,
          existingValue: existing.githubUrl,
          similarity: repoSim,
          reason: `Similar repository (${queryRepo} ~ ${existingRepo})`,
        });
      }
    }
  }

  // 4. Contract addresses comparison
  let contractSim = 0;
  if (query.contractAddresses?.length && existing.contractAddresses?.length) {
    const contractComp = compareContractAddresses(
      query.contractAddresses,
      existing.contractAddresses,
    );
    contractSim = contractComp.similarity;
    if (contractComp.common.length > 0) {
      fieldMatches.push({
        field: "contractAddresses",
        sourceValue: query.contractAddresses,
        existingValue: existing.contractAddresses,
        similarity: contractSim,
        reason: `Shares ${contractComp.common.length} smart contract address(es)`,
      });
      summaryReasons.push(`Shared contract address: ${contractComp.common[0].slice(0, 8)}...`);
    }
  }

  // Check for exact duplicate collision triggers:
  // Exact name OR exact domain OR exact repo OR matching contract addresses
  const isExactCollision =
    (nameSim === 1 && (domainSim === 1 || repoSim === 1)) ||
    (domainSim === 1 && repoSim === 1) ||
    (domainSim === 1 && nameSim >= 0.9) ||
    (repoSim === 1 && nameSim >= 0.9) ||
    (contractSim === 1 && nameSim >= 0.8);

  // Calculate composite weighted similarity
  let totalWeight = 0;
  let weightedScore = 0;

  if (query.name && existing.name) {
    weightedScore += nameSim * 0.35;
    totalWeight += 0.35;
  }
  if (queryDomain && existingDomain) {
    weightedScore += domainSim * 0.35;
    totalWeight += 0.35;
  }
  if (queryRepo && existingRepo) {
    weightedScore += repoSim * 0.20;
    totalWeight += 0.20;
  }
  if (query.contractAddresses?.length && existing.contractAddresses?.length) {
    weightedScore += contractSim * 0.10;
    totalWeight += 0.10;
  }

  const overallSimilarity = totalWeight > 0 ? weightedScore / totalWeight : 0;

  // Determine severity
  let severity: MatchSeverity;
  if (isExactCollision || overallSimilarity >= 0.95) {
    severity = "exact";
  } else if (overallSimilarity >= 0.65 || (domainSim === 1 && overallSimilarity >= 0.5)) {
    severity = "likely";
  } else if (overallSimilarity >= 0.40 || fieldMatches.length > 0) {
    severity = "possible";
  } else {
    return null; // Not a duplicate
  }

  return {
    project: existing,
    overallSimilarity: Math.min(1, Math.round(overallSimilarity * 100) / 100),
    severity,
    isExact: severity === "exact",
    fieldMatches,
    summaryReasons,
  };
}
