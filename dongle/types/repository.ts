/**
 * Repository metadata types and validation
 */

export interface RepositoryMetadata {
  url: string;
  host: "github" | "gitlab" | "bitbucket";
  owner: string;
  repo: string;
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
    host: "github" | "gitlab" | "bitbucket";
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
] as const;

export type SupportedHost = typeof SUPPORTED_HOSTS[number];
