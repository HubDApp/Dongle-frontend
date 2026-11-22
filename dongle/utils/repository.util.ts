/**
 * Repository URL validation and parsing utilities
 */

import {
  RepositoryHost,
  RepositoryValidationResult,
  SUPPORTED_HOSTS,
} from "@/types/repository";

const HOST_MAP: Record<string, RepositoryHost> = {
  "github.com": "github",
  "gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
  "gitea.com": "gitea",
};

const HOST_CANONICAL: Record<RepositoryHost, string> = {
  github: "github.com",
  gitlab: "gitlab.com",
  bitbucket: "bitbucket.org",
  gitea: "gitea.com",
};

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./i, "");
}

const HAS_PROTOCOL = /^[a-z][a-z\d+\-.]*:\/\//i;

/**
 * Validate and parse a repository URL.
 * Supports GitHub, GitLab, Bitbucket, and Gitea.
 */
export function validateRepositoryUrl(
  url: string
): RepositoryValidationResult {
  if (!url || url.trim().length === 0) {
    return {
      isValid: true, // Empty is valid (optional field)
    };
  }

  try {
    const normalized = url.trim();
    const parsedUrl = HAS_PROTOCOL.test(normalized)
      ? new URL(normalized)
      : new URL(`https://${normalized}`);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        isValid: false,
        error: "Invalid URL format. Repository URLs must use http or https.",
      };
    }

    const hostname = stripWww(parsedUrl.hostname.toLowerCase());

    if (!SUPPORTED_HOSTS.includes(hostname as (typeof SUPPORTED_HOSTS)[number])) {
      return {
        isValid: false,
        error: `Unsupported repository host. Supported hosts: ${SUPPORTED_HOSTS.join(", ")}`,
      };
    }

    const pathParts = parsedUrl.pathname
      .split("/")
      .filter((part) => part.length > 0);

    if (pathParts.length < 2) {
      return {
        isValid: false,
        error: "Invalid repository URL format. Expected: https://github.com/owner/repo",
      };
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    const cleanRepo = repo.replace(/\.git$/, "");

    if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(cleanRepo)) {
      return {
        isValid: false,
        error: "Repository owner and name contain invalid characters",
      };
    }

    return {
      isValid: true,
      metadata: {
        host: HOST_MAP[hostname],
        owner,
        repo: cleanRepo,
      },
    };
  } catch {
    return {
      isValid: false,
      error: "Invalid URL format",
    };
  }
}

/**
 * Normalize a repository URL to a standard format
 */
export function normalizeRepositoryUrl(url: string): string {
  const validation = validateRepositoryUrl(url);

  if (!validation.isValid || !validation.metadata) {
    return url;
  }

  const { host, owner, repo } = validation.metadata;
  return `https://${HOST_CANONICAL[host]}/${owner}/${repo}`;
}

/**
 * Extract repository info from URL
 */
export function parseRepositoryUrl(url: string) {
  const validation = validateRepositoryUrl(url);
  return validation.metadata;
}
