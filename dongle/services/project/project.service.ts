import { mockProjects } from "@/data/mockProjects";

export interface Project {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  reviews: number;
  createdAt: string;
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
    return mockProjects.find((p) => p.id === id) || null;
  },

  /**
   * Get projects by category
   */
  getProjectsByCategory(category: string): Project[] {
    if (category === "All") {
      return mockProjects;
    }
    return mockProjects.filter((p) => p.category === category);
  },

  /**
   * Search projects by name or description
   */
  searchProjects(query: string): Project[] {
    const q = query.toLowerCase();
    return mockProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  },

  /**
   * Get unique categories from all projects
   */
  getCategories(): string[] {
    const categories = new Set(mockProjects.map((p) => p.category));
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
