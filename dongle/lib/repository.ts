/**
 * Repository URL validation and parsing utilities
 */

import {
  RepositoryValidationResult,
  SUPPORTED_HOSTS,
} from "@/types/repository";

/**
 * Validate and parse a repository URL
 * Supports GitHub, GitLab, and Bitbucket
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
    let parsedUrl: URL;

    // Handle URLs without protocol
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      parsedUrl = new URL(`https://${normalized}`);
    } else {
      parsedUrl = new URL(normalized);
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Check if host is supported
    if (!SUPPORTED_HOSTS.includes(hostname as any)) {
      return {
        isValid: false,
        error: `Unsupported repository host. Supported hosts: ${SUPPORTED_HOSTS.join(", ")}`,
      };
    }

    // Parse path to extract owner and repo
    const pathParts = parsedUrl.pathname
      .split("/")
      .filter((part) => part.length > 0);

    if (pathParts.length < 2) {
      return {
        isValid: false,
        error: "Invalid repository URL format. Expected: https://github.com/owner/repo",
      };
    }

    const [owner, repo] = pathParts;

    // Validate owner and repo names
    if (!owner || !repo) {
      return {
        isValid: false,
        error: "Repository URL must include both owner and repository name",
      };
    }

    // Remove .git suffix if present
    const cleanRepo = repo.replace(/\.git$/, "");

    // Map hostname to host type
    const hostMap: Record<string, "github" | "gitlab" | "bitbucket"> = {
      "github.com": "github",
      "gitlab.com": "gitlab",
      "bitbucket.org": "bitbucket",
    };

    return {
      isValid: true,
      metadata: {
        host: hostMap[hostname],
        owner,
        repo: cleanRepo,
      },
    };
  } catch (error) {
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
  const hostMap: Record<string, string> = {
    github: "github.com",
    gitlab: "gitlab.com",
    bitbucket: "bitbucket.org",
  };

  return `https://${hostMap[host]}/${owner}/${repo}`;
}

/**
 * Extract repository info from URL
 */
export function parseRepositoryUrl(url: string) {
  const validation = validateRepositoryUrl(url);
  return validation.metadata;
}
