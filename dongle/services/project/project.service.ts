import { mockProjects } from "@/data/mockProjects";
import { Project } from "@/types/project";

/**
 * Migrate a project ensuring primaryCategory and tags are present
 */
const migrateProject = (p: Project): Project => {
  const migrated = { ...p };
  if (migrated.category && !migrated.primaryCategory) {
    migrated.primaryCategory = migrated.category;
  }
  if (!migrated.tags) {
    migrated.tags = migrated.category ? [migrated.category] : [];
  }
  return migrated;
};

/**
 * Unified project service that provides a single source of truth
 * for project data across the application
 */
export const projectService = {
  /**
   * Get all projects
   */
  getAllProjects(): Project[] {
    return mockProjects.map(migrateProject);
  },

  /**
   * Get a project by ID
   * Returns null if project not found
   */
  getProjectById(id: string): Project | null {
    const project = mockProjects.find((p) => p.id === id);
    return project ? migrateProject(project) : null;
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
};
