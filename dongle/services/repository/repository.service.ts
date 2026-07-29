/**
 * Repository metadata fetching service
 * Fetches basic metadata from supported repository hosts
 */

import { RepositoryMetadata } from "@/types/repository";
import { parseRepositoryUrl } from "@/lib/repository";

/**
 * Fetch repository metadata from GitHub
 */
async function fetchGitHubMetadata(
  owner: string,
  repo: string
): Promise<RepositoryMetadata | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      url: data.html_url,
      host: "github",
      owner,
      repo,
      stars: data.stargazers_count,
      forks: data.forks_count,
      license: data.license?.spdx_id || data.license?.name,
      lastUpdate: data.updated_at,
      description: data.description,
      language: data.language,
      topics: data.topics || [],
    };
  } catch (error) {
    console.error("Failed to fetch GitHub metadata:", error);
    return null;
  }
}

/**
 * Fetch repository metadata from GitLab
 */
async function fetchGitLabMetadata(
  owner: string,
  repo: string
): Promise<RepositoryMetadata | null> {
  try {
    const projectPath = encodeURIComponent(`${owner}/${repo}`);
    const response = await fetch(
      `https://gitlab.com/api/v4/projects/${projectPath}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`GitLab API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      url: data.web_url,
      host: "gitlab",
      owner,
      repo,
      stars: data.star_count,
      forks: data.forks_count,
      lastUpdate: data.last_activity_at,
      description: data.description,
      topics: data.topics || data.tag_list || [],
    };
  } catch (error) {
    console.error("Failed to fetch GitLab metadata:", error);
    return null;
  }
}

/**
 * Fetch repository metadata from Bitbucket
 */
async function fetchBitbucketMetadata(
  owner: string,
  repo: string
): Promise<RepositoryMetadata | null> {
  try {
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`Bitbucket API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      url: data.links?.html?.href,
      host: "bitbucket",
      owner,
      repo,
      lastUpdate: data.updated_on,
      description: data.description,
      language: data.language,
    };
  } catch (error) {
    console.error("Failed to fetch Bitbucket metadata:", error);
    return null;
  }
}

/**
 * Repository service for fetching metadata
 */
export const repositoryService = {
  /**
   * Fetch repository metadata from URL
   */
  async fetchMetadata(url: string): Promise<RepositoryMetadata | null> {
    const parsed = parseRepositoryUrl(url);

    if (!parsed) {
      console.error("Failed to parse repository URL:", url);
      return null;
    }

    const { host, owner, repo } = parsed;

    switch (host) {
      case "github":
        return fetchGitHubMetadata(owner, repo);
      case "gitlab":
        return fetchGitLabMetadata(owner, repo);
      case "bitbucket":
        return fetchBitbucketMetadata(owner, repo);
      default:
        console.error("Unsupported repository host:", host);
        return null;
    }
  },

  /**
   * Format star count for display (e.g., 1.5k, 12k)
   */
  formatStarCount(stars: number): string {
    if (stars >= 1000) {
      return `${(stars / 1000).toFixed(1)}k`;
    }
    return stars.toString();
  },

  /**
   * Format last update date
   */
  formatLastUpdate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  },
};
