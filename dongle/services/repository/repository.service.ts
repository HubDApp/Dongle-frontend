/**
 * Repository metadata fetching service
 * Fetches basic metadata from supported repository hosts
 */

import { RepositoryMetadata } from "@/types/repository";
import { parseRepositoryUrl } from "@/lib/repository";
import { getJson } from "@/lib/data-layer";

/**
 * Fetch repository metadata from GitHub
 */
async function fetchGitHubMetadata(
  owner: string,
  repo: string
): Promise<RepositoryMetadata | null> {
  try {
    const data = await getJson<{
      html_url: string;
      stargazers_count: number;
      forks_count: number;
      license?: { spdx_id?: string; name?: string };
      updated_at: string;
      description: string;
      language: string;
      topics?: string[];
    }>({
      method: "GET",
      url: `https://api.github.com/repos/${owner}/${repo}`,
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      tags: ["repository"],
      persist: true,
    });

    if (!data.ok || !data.data) {
      console.error(`GitHub API error: ${data.status}`);
      return null;
    }

    const payload = data.data;

    return {
      url: payload.html_url,
      host: "github",
      owner,
      repo,
      stars: payload.stargazers_count,
      forks: payload.forks_count,
      license: payload.license?.spdx_id || payload.license?.name,
      lastUpdate: payload.updated_at,
      description: payload.description,
      language: payload.language,
      topics: payload.topics || [],
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
    const data = await getJson<{
      web_url: string;
      star_count: number;
      forks_count: number;
      last_activity_at: string;
      description: string;
      topics?: string[];
      tag_list?: string[];
    }>({
      method: "GET",
      url: `https://gitlab.com/api/v4/projects/${projectPath}`,
      headers: {
        Accept: "application/json",
      },
      tags: ["repository"],
      persist: true,
    });

    if (!data.ok || !data.data) {
      console.error(`GitLab API error: ${data.status}`);
      return null;
    }

    const payload = data.data;

    return {
      url: payload.web_url,
      host: "gitlab",
      owner,
      repo,
      stars: payload.star_count,
      forks: payload.forks_count,
      lastUpdate: payload.last_activity_at,
      description: payload.description,
      topics: payload.topics || payload.tag_list || [],
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
    const data = await getJson<{
      links?: { html?: { href?: string } };
      updated_on: string;
      description: string;
      language: string;
    }>({
      method: "GET",
      url: `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}`,
      headers: {
        Accept: "application/json",
      },
      tags: ["repository"],
      persist: true,
    });

    if (!data.ok || !data.data) {
      console.error(`Bitbucket API error: ${data.status}`);
      return null;
    }

    const payload = data.data;

    return {
      url: payload.links?.html?.href,
      host: "bitbucket",
      owner,
      repo,
      lastUpdate: payload.updated_on,
      description: payload.description,
      language: payload.language,
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
