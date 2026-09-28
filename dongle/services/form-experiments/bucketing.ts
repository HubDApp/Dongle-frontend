/**
 * Deterministic User Bucketing for Form Experiments
 */

import { generateId } from "@/lib/id-generator";
import type { ExperimentVariant, FormExperiment } from "./types";

const USER_ID_KEY = "dongle_ab_anonymous_user_id";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Get or create a persistent anonymous user identifier
 */
export function getOrCreateAnonymousUserId(): string {
  if (!isBrowser()) return "server_anonymous_user";
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = `usr_${generateId()}`;
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous_fallback_user";
  }
}

/**
 * 32-bit FNV-1a hash function for consistent string hashing
 */
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

/**
 * Deterministically assign a variant to a user based on traffic weights
 */
export function assignVariant(
  experiment: FormExperiment,
  userId: string,
): ExperimentVariant {
  // If experiment has a declared winner rolled out to 100%, return winner
  if (experiment.winnerVariantId && experiment.rolloutWinnerToAll) {
    const winner = experiment.variants.find((v) => v.id === experiment.winnerVariantId);
    if (winner) return winner;
  }

  // If only 1 variant or no variants, return first or fallback
  if (!experiment.variants || experiment.variants.length === 0) {
    return {
      id: "control",
      name: "Control",
      description: "Default form",
      weight: 100,
      isControl: true,
    };
  }
  if (experiment.variants.length === 1) {
    return experiment.variants[0];
  }

  // Calculate total weight
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight <= 0) return experiment.variants[0];

  // Hash experimentId + userId to integer in [0, 10000)
  const hashKey = `${experiment.id}:${userId}`;
  const bucketValue = (hashString(hashKey) % 10000) / 10000; // 0.0000 to 0.9999

  // Find variant corresponding to cumulative weight
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight / totalWeight;
    if (bucketValue < cumulative) {
      return variant;
    }
  }

  return experiment.variants[0];
}
