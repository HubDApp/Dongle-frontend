"use client";

import useSWR from "swr";
import { Project } from "@/types/project";
import { projectMetaCache } from "@/lib/project-cache";
import type { VerificationStatus } from "@/components/projects/VerificationBadge";

function isValidProject(p: unknown): p is Project {
  return (
    typeof p === "object" &&
    p !== null &&
    "id" in p &&
    "name" in p &&
    "primaryCategory" in p &&
    "description" in p &&
    "rating" in p &&
    "reviews" in p
  );
}

export interface UseProjectMetadataReturn {
  project: Project | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProjectMetadata(id: string | null | undefined): UseProjectMetadataReturn {
  const { data, error, isValidating, isLoading, mutate } = useSWR<
    Project | null,
    Error
  >(
    id ? `/project/metadata/${id}` : null,
    async (key) => {
      if (!id) return null;

      // Try cache first
      const cached = projectMetaCache.get(id);
      if (cached !== undefined) {
        return cached;
      }

      // Fetch from service
      const service = await import("@/services/project/project.service");
      const project = await service.projectService.fetchById(id);

      // Cache the result
      if (project && isValidProject(project)) {
        projectMetaCache.set(id, project);
      }

      return project;
    },
    {
      revalidateInterval: 300_000, // 5 minutes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000, // 1 minute deduping
      shouldRetryOnError: true,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
    },
  );

  // Keep projectMetaCache in sync with SWR data
  if (data && isValidProject(data)) {
    projectMetaCache.set(id!, data);
  } else if (!data) {
    projectMetaCache.delete(id!);
  }

  return {
    project: data,
    isLoading: isLoading || isValidating,
    error: error || null,
    refresh: () => mutate(),
  };
}