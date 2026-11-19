/** Storage quota checks for the near-limit warning and the storage settings page. */

export const STORAGE_WARNING_THRESHOLD = 0.8;

export interface StorageEstimateResult {
  usage: number;
  quota: number;
  ratio: number;
  nearLimit: boolean;
}

export async function getStorageEstimate(): Promise<StorageEstimateResult | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const ratio = quota > 0 ? usage / quota : 0;
    return { usage, quota, ratio, nearLimit: ratio > STORAGE_WARNING_THRESHOLD };
  } catch {
    return null;
  }
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
