/**
 * Repository metadata types and validation
 */

export type RepositoryHost = "github" | "gitlab" | "bitbucket" | "gitea";

export interface RepositoryMetadata {
  url: string;
  host: RepositoryHost;
  owner: string;
  repo: string;
  name?: string;
  homepage?: string;
  stars?: number;
  forks?: number;
  license?: string;
  lastUpdate?: string;
  description?: string;
  language?: string;
  topics?: string[];
}

export interface RepositoryValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    host: RepositoryHost;
    owner: string;
    repo: string;
  };
}

/**
 * Supported repository hosts
 */
export const SUPPORTED_HOSTS = [
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "gitea.com",
] as const;

export type SupportedHost = typeof SUPPORTED_HOSTS[number];
