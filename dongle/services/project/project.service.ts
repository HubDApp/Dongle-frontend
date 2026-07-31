import { mockProjects } from "@/data/mockProjects";
import { Project } from "@/types/project";
import { projectOwnerService } from "./project-owner.service";
import { registry } from "@/services/data-access/registry";

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
