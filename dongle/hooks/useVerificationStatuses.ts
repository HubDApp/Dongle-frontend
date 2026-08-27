"use client";

import { useState, useEffect, useRef } from "react";
import { lazyStellarService } from "@/services/stellar/lazy-stellar.service";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";

/**
 * Batch-fetch on-chain verification statuses for a list of project IDs.
 *
 * Returns a `Record<projectId, VerificationStatus>` that updates whenever
 * `projectIds` changes. Falls back to `"NONE"` for any project that errors.
 *
 * @example
 * ```tsx
 * const statuses = useVerificationStatuses(projectIds);
 * // statuses["project-123"] === "VERIFIED"
 * ```
 */
export function useVerificationStatuses(
  projectIds: string[],
): Record<string, VerificationStatus> {
  const [statuses, setStatuses] = useState<Record<string, VerificationStatus>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (projectIds.length === 0) {
      setStatuses({});
      return;
    }

    let cancelled = false;

    const fetchStatuses = async () => {
      const result: Record<string, VerificationStatus> = {};
      await Promise.all(
        projectIds.map(async (id) => {
          try {
            const status = await lazyStellarService.getVerificationStatus(id);
            result[id] = status;
          } catch {
            result[id] = "NONE";
          }
        }),
      );
      if (!cancelled && mountedRef.current) {
        setStatuses(result);
      }
    };

    void fetchStatuses();
    return () => {
      cancelled = true;
    };
  }, [projectIds.join(",")]);

  return statuses;
}
