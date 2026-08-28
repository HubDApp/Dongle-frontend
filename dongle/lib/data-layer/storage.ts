/**
 * Thin localStorage adapter. No-ops on the server and when storage is blocked.
 * Never used for auth tokens or other secrets — callers decide what to persist.
 */

export const CACHE_STORAGE_KEY = "dongle_data_cache";
export const QUEUE_STORAGE_KEY = "dongle_mutation_queue";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore persistence failures */
  }
}

export function removeKey(key: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
