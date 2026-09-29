/**
 * Repository URL validation and parsing utilities
 */

import {
  RepositoryValidationResult,
  SUPPORTED_HOSTS,
} from "@/types/repository";

const HOST_MAP: Record<string, "github" | "gitlab" | "bitbucket"> = {
  "github.com": "github",
  "gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
};

const HOST_CANONICAL: Record<"github" | "gitlab" | "bitbucket", string> = {
  github: "github.com",
  gitlab: "gitlab.com",
  bitbucket: "bitbucket.org",
};

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./i, "");
}

/**
 * Validate and parse a repository URL.
 * Supports GitHub, GitLab, and Bitbucket.
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

    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      parsedUrl = new URL(`https://${normalized}`);
    } else {
      parsedUrl = new URL(normalized);
    }

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

    if (!owner || !repo) {
      return {
        isValid: false,
        error: "Repository URL must include both owner and repository name",
      };
    }

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
