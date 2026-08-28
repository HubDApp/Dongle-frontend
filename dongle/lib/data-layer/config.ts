import type { DataLayerConfig } from "./types";

const DEFAULTS: DataLayerConfig = {
  cacheTtlMs: 60_000,
  staleTtlMs: 5 * 60_000,
  dedupeWindowMs: 0,
  syncMaxRetries: 3,
  syncInitialDelayMs: 1_000,
  syncBackoffMultiplier: 2,
  syncMaxDelayMs: 10_000,
  persistCache: true,
  persistQueue: true,
};

let overrides: Partial<DataLayerConfig> = {};

function readNumber(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") return fallback;
  if (value === "false" || value === "0") return false;
  if (value === "true" || value === "1") return true;
  return fallback;
}

function fromEnv(): DataLayerConfig {
  return {
    cacheTtlMs: readNumber(process.env.NEXT_PUBLIC_DATA_CACHE_TTL_MS, DEFAULTS.cacheTtlMs),
    staleTtlMs: readNumber(process.env.NEXT_PUBLIC_DATA_STALE_TTL_MS, DEFAULTS.staleTtlMs),
    dedupeWindowMs: readNumber(
      process.env.NEXT_PUBLIC_DATA_DEDUPE_WINDOW_MS,
      DEFAULTS.dedupeWindowMs,
    ),
    syncMaxRetries: readNumber(
      process.env.NEXT_PUBLIC_DATA_SYNC_MAX_RETRIES,
      DEFAULTS.syncMaxRetries,
    ),
    syncInitialDelayMs: readNumber(
      process.env.NEXT_PUBLIC_DATA_SYNC_INITIAL_DELAY_MS,
      DEFAULTS.syncInitialDelayMs,
    ),
    syncBackoffMultiplier: readNumber(
      process.env.NEXT_PUBLIC_DATA_SYNC_BACKOFF_MULTIPLIER,
      DEFAULTS.syncBackoffMultiplier,
    ),
    syncMaxDelayMs: readNumber(
      process.env.NEXT_PUBLIC_DATA_SYNC_MAX_DELAY_MS,
      DEFAULTS.syncMaxDelayMs,
    ),
    persistCache: readBool(process.env.NEXT_PUBLIC_DATA_PERSIST_CACHE, DEFAULTS.persistCache),
    persistQueue: readBool(process.env.NEXT_PUBLIC_DATA_PERSIST_QUEUE, DEFAULTS.persistQueue),
  };
}

export function getDataLayerConfig(): DataLayerConfig {
  return { ...fromEnv(), ...overrides };
}

export function configureDataLayer(partial: Partial<DataLayerConfig>): void {
  overrides = { ...overrides, ...partial };
}

export function resetDataLayerConfig(): void {
  overrides = {};
}

export { DEFAULTS as DATA_LAYER_DEFAULTS };
