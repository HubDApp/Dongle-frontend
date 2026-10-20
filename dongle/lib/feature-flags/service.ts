/**
 * Feature flag service (Issue #714).
 *
 * A dependency-free, client-persisted flag store. It is intentionally small so
 * it can be swapped for LaunchDarkly/Optimizely later without touching callers:
 * only `isFeatureEnabled`, `getVariant`, and the metric helpers are used by the
 * product code.
 */

import {
  computeExperimentResult,
  pickVariant,
  withWinnerRolledOut,
} from "./engine";
import type {
  ExperimentResult,
  FeatureFlag,
  FlagVariant,
  VariantMetrics,
} from "./types";

const FLAGS_KEY = "dongle:feature-flags:v1";
const METRICS_KEY = "dongle:feature-flags:metrics:v1";

type MetricsStore = Record<string, VariantMetrics[]>;

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode / quota) — fail silently */
  }
}

function seedFlag(): FeatureFlag {
  const now = new Date().toISOString();
  return {
    key: "homepage_hero",
    name: "Homepage hero variant",
    description: "A/B test two hero headlines on the landing page.",
    enabled: true,
    variants: [
      { key: "control", name: "Control", weight: 1 },
      { key: "variant", name: "Variant B", weight: 1 },
    ],
    rolloutPercentage: 100,
    status: "running",
    createdAt: now,
    updatedAt: now,
  };
}

export function listFlags(): FeatureFlag[] {
  const flags = readJson<FeatureFlag[]>(FLAGS_KEY, []);
  if (flags.length === 0) {
    const seeded = [seedFlag()];
    writeJson(FLAGS_KEY, seeded);
    return seeded;
  }
  return flags;
}

export function getFlag(key: string): FeatureFlag | null {
  return listFlags().find((flag) => flag.key === key) ?? null;
}

export function upsertFlag(flag: FeatureFlag): FeatureFlag {
  const flags = listFlags();
  const index = flags.findIndex((existing) => existing.key === flag.key);
  const next: FeatureFlag = { ...flag, updatedAt: new Date().toISOString() };
  if (index >= 0) flags[index] = next;
  else flags.push(next);
  writeJson(FLAGS_KEY, flags);
  return next;
}

export function deleteFlag(key: string): void {
  writeJson(
    FLAGS_KEY,
    listFlags().filter((flag) => flag.key !== key),
  );
  const metrics = readJson<MetricsStore>(METRICS_KEY, {});
  delete metrics[key];
  writeJson(METRICS_KEY, metrics);
}

/** Convenience factory for a 50/50 two-variant flag. */
export function createFlag(
  key: string,
  name: string,
  variants: FlagVariant[] = [
    { key: "control", name: "Control", weight: 1 },
    { key: "variant", name: "Variant B", weight: 1 },
  ],
): FeatureFlag {
  return upsertFlag({
    key,
    name,
    enabled: true,
    variants,
    rolloutPercentage: 100,
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/** True when the feature is enabled for the user. */
export function isFeatureEnabled(key: string, userId: string, defaultValue = false): boolean {
  const flag = getFlag(key);
  if (!flag) return defaultValue;
  if (!flag.enabled) return false;
  return pickVariant(flag, userId) !== null;
}

/** Active variant key for a user, or `null` when not enrolled. */
export function getVariant(key: string, userId: string): string | null {
  const flag = getFlag(key);
  if (!flag) return null;
  return pickVariant(flag, userId)?.key ?? null;
}

function readMetrics(): MetricsStore {
  return readJson<MetricsStore>(METRICS_KEY, {});
}

export function getMetrics(flagKey: string): VariantMetrics[] {
  const flag = getFlag(flagKey);
  const stored = readMetrics()[flagKey] ?? [];
  const byVariant = new Map(stored.map((m) => [m.variantKey, m]));
  return (flag?.variants ?? []).map((variant) => {
    const existing = byVariant.get(variant.key);
    return existing
      ? { ...existing }
      : { variantKey: variant.key, exposures: 0, conversions: 0 };
  });
}

function increment(flagKey: string, variantKey: string, field: "exposures" | "conversions"): void {
  const store = readMetrics();
  const list = store[flagKey] ?? [];
  const existing = list.find((m) => m.variantKey === variantKey);
  if (existing) {
    existing[field] += 1;
  } else {
    list.push({
      variantKey,
      exposures: field === "exposures" ? 1 : 0,
      conversions: field === "conversions" ? 1 : 0,
    });
  }
  store[flagKey] = list;
  writeJson(METRICS_KEY, store);
}

/** Record that a user saw a variant. */
export function recordExposure(flagKey: string, variantKey: string): void {
  increment(flagKey, variantKey, "exposures");
}

/** Record a goal conversion for a variant. */
export function recordConversion(flagKey: string, variantKey: string): void {
  increment(flagKey, variantKey, "conversions");
}

export function resetMetrics(flagKey: string): void {
  const store = readMetrics();
  delete store[flagKey];
  writeJson(METRICS_KEY, store);
}

export function getExperimentResult(flagKey: string): ExperimentResult | null {
  const flag = getFlag(flagKey);
  if (!flag) return null;
  return computeExperimentResult(flag, getMetrics(flagKey));
}

/**
 * Automatically select the winning variant and roll it out to 100% of users.
 * Returns the updated flag, or `null` when no significant winner exists yet.
 */
export function selectWinner(flagKey: string): FeatureFlag | null {
  const flag = getFlag(flagKey);
  if (!flag) return null;
  const result = computeExperimentResult(flag, getMetrics(flagKey));
  if (!result.winnerKey) return null;
  return upsertFlag(withWinnerRolledOut(flag, result.winnerKey));
}
