"use client";

import useSWR from "swr";
import { VerificationStatus } from "@/components/projects/VerificationBadge";
import { verificationStatusCache } from "@/lib/project-cache";

export interface UseVerificationStatusesReturn {
  statuses: Record<string, VerificationStatus>;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useVerificationStatuses(
  ids: string[],
  options?: { bypassCache?: boolean },
): UseVerificationStatusesReturn {
  const { data, error, isValidating, mutate } = useSWR<Record<string, VerificationStatus>, Error>(
    ids,
    async (key) => {
      const { batchFetchVerificationStatuses } = await import(
        "@/services/stellar/batch-verification.service"
      );

      const signal = AbortSignal.timeout(30_000);

      try {
        const statuses = await batchFetchVerificationStatuses(key, signal, options?.bypassCache);

        // Update the underlying project cache
        if (statuses) {
          const statusRecord: Record<string, VerificationStatus> = {};
          for (const [id, status] of Object.entries(statuses)) {
            verificationStatusCache.set(id, status);
            statusRecord[id] = status;
          }
        }

        return statuses || {};
      } catch (e) {
        throw e;
      } finally {
        signal.abort();
      }
    },
    {
      revalidateInterval: 300_000, // 5 minutes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      shouldRetryOnError: true,
      focusThrottleInterval: 2000,
    },
  );

  // Sync verificationStatusCache with SWR data
  if (data) {
    for (const [id, status] of Object.entries(data)) {
      verificationStatusCache.set(id, status);
    }
  }

  return {
    statuses: data || {},
    isLoading: isLoading || isValidating,
    error: error || null,
    refresh: () => mutate(),
  };
}