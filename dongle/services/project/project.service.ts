import { mockProjects } from "@/data/mockProjects";
import { Project } from "@/types/project";
import { extractDomain } from "@/lib/url";

/**
 * Normalize a string for case-insensitive comparison
 */
function norm(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Normalize a URL for comparison: removes protocol and trailing slash, lowercases
 */
function normalizeUrlForComparison(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

/**
 * Duplicate detection options
 */
export interface DuplicateDetectionOptions {
  /** Name from the submission form */
  name: string;
  /** Website URL from the submission form */
  websiteUrl?: string;
  /** Repository URL from the submission form */
  githubUrl?: string;
  /** Project ID to exclude (when editing an existing project) */
  excludeProjectId?: string;
}

/**
 * Result of a duplicate detection check
 */
export interface DuplicateDetectionResult {
  /** Whether likely duplicates were found */
  hasDuplicates: boolean;
  /** The matching projects */
  matches: Project[];
  /** Human-readable explanation of what matched */
  reasons: string[];
}

/**
 * Unified project service that provides a single source of truth
 * for project data across the application
 */
export const projectService = {
  /**
   * Get all projects
   */
  getAllProjects(): Project[] {
    return mockProjects;
  },

  /**
   * Get a project by ID
   * Returns null if project not found
   */
  getProjectById(id: string): Project | null {
    return mockProjects.find((p) => p.id === id) ?? null;
  },

  /**
   * Get projects by category
   */
  getProjectsByCategory(category: string): Project[] {
    const all = this.getAllProjects();
    if (category === "All") {
      return all;
    }
    return all.filter((p) => p.primaryCategory === category);
  },
  
  /**
   * Get projects by tags
   */
  getProjectsByTags(tags: string[]): Project[] {
    if (!tags || tags.length === 0) return this.getAllProjects();
    return this.getAllProjects().filter((p) => 
      p.tags?.some((t) => tags.includes(t))
    );
  },

  /**
   * Search projects by name or description
   */
  searchProjects(query: string): Project[] {
    const q = query.toLowerCase();
    return this.getAllProjects().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags?.some(tag => tag.toLowerCase().includes(q))
    );
  },

  /**
   * Get unique categories from all projects
   */
  getCategories(): string[] {
    const categories = new Set(this.getAllProjects().map((p) => p.primaryCategory).filter(Boolean));
    return ["All", ...Array.from(categories)];
  },

  /**
   * Sort projects by various criteria
   */
  sortProjects(
    projects: Project[],
    sortBy: "rating" | "newest" | "popular"
  ): Project[] {
    const sorted = [...projects];
    if (sortBy === "rating") {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "popular") {
      sorted.sort((a, b) => b.reviews - a.reviews);
    } else if (sortBy === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return sorted;
  },

  /**
   * Detect possible duplicate projects based on name, domain, and repository URL.
   * All checks are case-insensitive and domain-normalized.
   *
   * @returns Object with hasDuplicates flag, matching projects, and human-readable reasons
   */
  detectDuplicates(options: DuplicateDetectionOptions): DuplicateDetectionResult {
    const { name, websiteUrl, githubUrl, excludeProjectId } = options;
    const matches: Project[] = [];
    const reasons: string[] = [];
    const seenIds = new Set<string>();

    const existingProjects = this.getAllProjects();
    const submittedDomain = websiteUrl ? extractDomain(websiteUrl) : "";

    for (const existing of existingProjects) {
      // Skip the project being edited
      if (excludeProjectId && existing.id === excludeProjectId) continue;
      if (seenIds.has(existing.id)) continue;

      const matchReasons: string[] = [];

      // Check by normalized name (case-insensitive, trimmed)
      if (norm(existing.name) === norm(name)) {
        matchReasons.push("identical name");
      }

      // Check by website domain (case-insensitive, domain-normalized)
      if (
        existing.domain &&
        submittedDomain &&
        normalizeUrlForComparison(existing.domain) === normalizeUrlForComparison(submittedDomain)
      ) {
        matchReasons.push("same website domain");
      }

      // Check by repository URL (case-insensitive, domain-normalized)
      if (
        existing.githubUrl &&
        githubUrl &&
        normalizeUrlForComparison(existing.githubUrl) === normalizeUrlForComparison(githubUrl)
      ) {
        matchReasons.push("same repository URL");
      }

      if (matchReasons.length > 0) {
        seenIds.add(existing.id);
        matches.push(existing);
        reasons.push(`“${existing.name}” — ${matchReasons.join(", ")}`);
      }
    }

    return {
      hasDuplicates: matches.length > 0,
      matches,
      reasons,
    };
  },
};
