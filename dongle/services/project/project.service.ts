import { mockProjects } from "@/data/mockProjects";
import { Project } from "@/types/project";
import { projectOwnerService } from "./project-owner.service";
import { projectSubmissionService } from "./project-submission.service";
import { registry } from "@/services/data-access/registry";
import { fuzzyMatch, levenshteinDistance } from "@/lib/utils";
import { unique } from "@/lib/array";

/**
 * Unified project service that provides a single source of truth
 * for project data across the application.
 *
 * Data access is delegated to the IProjectRepository implementation
 * registered in the DataAccessRegistry.  In local development the mock
 * (in-memory) repository is used automatically; a real backend / indexer
 * can be swapped in via `registry.setProjectRepository(...)` without
 * touching this file or any UI component.
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
    const project = mockProjects.find((p) => p.id === id) ?? null;
    if (!project) return null;

    const overrideOwner = projectOwnerService.getProjectOwnerOverride(project.id);
    if (overrideOwner) {
      return { ...project, ownerAddress: overrideOwner };
    }

    return project;
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
   * Get projects owned by a wallet address
   */
  getProjectsByOwner(ownerAddress: string): Project[] {
    const normalized = ownerAddress.trim();
    return this.getAllProjects().filter(
      (p) => p.ownerAddress?.trim() === normalized,
    );
  },

  /**
   * Get projects discoverable in the directory (excludes moderated-out submissions)
   */
  getDiscoverableProjects(): Project[] {
    return this.getAllProjects().filter((p) =>
      projectSubmissionService.isDiscoverable(p.id),
    );
  },

  /**
   * Search projects by name, description, or tags with fuzzy matching for names.
   * Results are sorted by relevance score (highest first).
   */
  searchProjects(query: string): Project[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getDiscoverableProjects();

    const discoverable = this.getDiscoverableProjects();
    const scored: { project: Project; score: number }[] = [];

    for (const p of discoverable) {
      const name = p.name.toLowerCase();
      const description = p.description.toLowerCase();
      const tags = (p.tags ?? []).map((t) => t.toLowerCase());

      let score = 0;

      if (name === q) {
        score += 100;
      }
      if (name.startsWith(q)) {
        score += 50;
      }
      if (name.includes(q)) {
        score += 30;
      }
      if (fuzzyMatch(p.name, query, 0.4)) {
        score += 20;
        const maxLen = Math.max(name.length, q.length);
        if (maxLen > 0) {
          const distance = levenshteinDistance(name, q);
          score += (1 - distance / maxLen) * 10;
        }
      }

      if (description.includes(q)) {
        score += 15;
      }
      if (fuzzyMatch(p.description, query, 0.5)) {
        score += 5;
      }

      for (const tag of tags) {
        if (tag === q) {
          score += 40;
        } else if (tag.includes(q) || q.includes(tag)) {
          score += 20;
        } else if (fuzzyMatch(tag, q, 0.5)) {
          score += 10;
        }
      }

      if (score > 0) {
        scored.push({ project: p, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.project);
  },

  /**
   * Get unique categories from all projects
   */
  getCategories(): string[] {
    const categories = unique(this.getAllProjects().map((p) => p.primaryCategory).filter(Boolean));
    return ["All", ...categories];
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

  // ── Repository-backed async API ──────────────────────────────────────────
  // These methods go through the DataAccessRegistry so that a real backend
  // or indexer can be plugged in without modifying UI components.

  /** Async: fetch all projects via the active repository implementation. */
  async fetchAll(): Promise<Project[]> {
    return registry.projects.getAll();
  },

  /** Async: fetch a single project by ID via the active repository. */
  async fetchById(id: string): Promise<Project | null> {
    const project = await registry.projects.getById(id);
    if (!project) return null;
    const overrideOwner = projectOwnerService.getProjectOwnerOverride(project.id);
    return overrideOwner ? { ...project, ownerAddress: overrideOwner } : project;
  },

  /** Async: fetch projects filtered by category via the active repository. */
  async fetchByCategory(category: string): Promise<Project[]> {
    return registry.projects.getByCategory(category);
  },

  /** Async: full-text search via the active repository. */
  async fetchSearch(query: string): Promise<Project[]> {
    return registry.projects.search(query);
  },
};
