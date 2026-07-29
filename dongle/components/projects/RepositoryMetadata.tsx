"use client";

import React, { useEffect, useState } from "react";
import { repositoryService } from "@/services/repository/repository.service";
import { RepositoryMetadata as RepoMetadata } from "@/types/repository";
import { Star, GitFork, Clock, FileCode, Tag, Shield } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface RepositoryMetadataProps {
  githubUrl: string;
}

export function RepositoryMetadata({ githubUrl }: RepositoryMetadataProps) {
  const [metadata, setMetadata] = useState<RepoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetadata() {
      if (!githubUrl) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await repositoryService.fetchMetadata(githubUrl);
        setMetadata(data);
      } catch (err) {
        console.error("Failed to load repository metadata:", err);
        setError("Failed to load repository data");
      } finally {
        setIsLoading(false);
      }
    }

    void loadMetadata();
  }, [githubUrl]);

  if (isLoading) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-center gap-3">
          <Spinner size="sm" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading repository data...
          </span>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return null; // Silently fail - metadata is optional
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-900/50">
      <div className="flex items-center gap-2 mb-4">
        <FileCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-bold">Repository Stats</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metadata.stars !== undefined && (
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Stars
              </div>
              <div className="font-bold">
                {repositoryService.formatStarCount(metadata.stars)}
              </div>
            </div>
          </div>
        )}

        {metadata.forks !== undefined && (
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Forks
              </div>
              <div className="font-bold">
                {repositoryService.formatStarCount(metadata.forks)}
              </div>
            </div>
          </div>
        )}

        {metadata.license && (
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                License
              </div>
              <div className="font-bold text-sm">{metadata.license}</div>
            </div>
          </div>
        )}

        {metadata.lastUpdate && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Updated
              </div>
              <div className="font-bold text-sm">
                {repositoryService.formatLastUpdate(metadata.lastUpdate)}
              </div>
            </div>
          </div>
        )}
      </div>

      {metadata.language && (
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-900/50">
          <div className="flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-zinc-500 dark:text-zinc-400">
              Primary Language:
            </span>
            <span className="font-medium">{metadata.language}</span>
          </div>
        </div>
      )}

      {metadata.topics && metadata.topics.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {metadata.topics.slice(0, 5).map((topic) => (
              <span
                key={topic}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
