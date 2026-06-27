import { describe, it, expect } from "vitest";
import { projectService } from "@/services/project/project.service";

/**
 * Integration tests for Discover-to-detail navigation data contract
 * Ensures that projects shown in Discover match the data on detail pages
 */
describe("Discover-to-Detail Navigation Data Contract", () => {
  describe("Project data consistency", () => {
    it("should return the same project from detail page as shown in discover", () => {
      const allProjects = projectService.getAllProjects();
      expect(allProjects.length).toBeGreaterThan(0);

      const firstProject = allProjects[0];
      const detailProject = projectService.getProjectById(firstProject.id);

      expect(detailProject).toBeDefined();
      expect(detailProject).toEqual(firstProject);
    });

    it("should have all required fields for detail page", () => {
      const allProjects = projectService.getAllProjects();

      for (const project of allProjects.slice(0, 10)) {
        expect(project.id).toBeTruthy();
        expect(project.name).toBeTruthy();
        expect(project.category).toBeTruthy();
        expect(project.description).toBeTruthy();
        expect(project.rating).toBeGreaterThanOrEqual(0);
        expect(project.rating).toBeLessThanOrEqual(5);
        expect(project.reviews).toBeGreaterThanOrEqual(0);
        expect(project.createdAt).toBeTruthy();
      }
    });

    it("should preserve rating and review counts across discover and detail", () => {
      const allProjects = projectService.getAllProjects();

      for (const discoverProject of allProjects.slice(0, 5)) {
        const detailProject = projectService.getProjectById(discoverProject.id);

        expect(detailProject?.rating).toEqual(discoverProject.rating);
        expect(detailProject?.reviews).toEqual(discoverProject.reviews);
        expect(detailProject?.category).toEqual(discoverProject.category);
      }
    });

    it("should return null for unknown project IDs", () => {
      const result = projectService.getProjectById("non-existent-project-id");
      expect(result).toBeNull();
    });

    it("should handle edge case IDs gracefully", () => {
      expect(projectService.getProjectById("")).toBeNull();
      expect(projectService.getProjectById("  ")).toBeNull();
      expect(projectService.getProjectById("-1")).toBeNull();
    });

    it("should maintain consistent data across multiple calls", () => {
      const id = projectService.getAllProjects()[0].id;

      const call1 = projectService.getProjectById(id);
      const call2 = projectService.getProjectById(id);
      const call3 = projectService.getProjectById(id);

      expect(call1).toEqual(call2);
      expect(call2).toEqual(call3);
    });

    it("should support URL-safe project IDs", () => {
      const allProjects = projectService.getAllProjects();

      for (const project of allProjects.slice(0, 10)) {
        // Project ID should be URL-safe (no special characters that need encoding)
        expect(project.id).toMatch(/^[a-zA-Z0-9\-_]*$/);

        // Should be retrievable by ID
        const retrieved = projectService.getProjectById(project.id);
        expect(retrieved?.id).toEqual(project.id);
      }
    });
  });

  describe("Category consistency", () => {
    it("should have valid categories in all projects", () => {
      const categories = projectService.getCategories();
      const allProjects = projectService.getAllProjects();

      for (const project of allProjects) {
        // Each project's category should be in the available categories
        expect(categories).toContain(project.category);
      }
    });

    it("should be able to filter projects by category and find them in detail", () => {
      const categories = projectService.getCategories().filter((c) => c !== "All");

      for (const category of categories.slice(0, 3)) {
        const projectsInCategory = projectService.getProjectsByCategory(category);

        for (const project of projectsInCategory.slice(0, 3)) {
          const detailProject = projectService.getProjectById(project.id);
          expect(detailProject?.category).toEqual(category);
        }
      }
    });
  });

  describe("Sorting consistency", () => {
    it("should sort correctly by rating", () => {
      const allProjects = projectService.getAllProjects();
      const sorted = projectService.sortProjects(allProjects, "rating");

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].rating).toBeGreaterThanOrEqual(sorted[i].rating);
      }
    });

    it("should sort correctly by popularity (review count)", () => {
      const allProjects = projectService.getAllProjects();
      const sorted = projectService.sortProjects(allProjects, "popular");

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].reviews).toBeGreaterThanOrEqual(sorted[i].reviews);
      }
    });

    it("should sort correctly by newest", () => {
      const allProjects = projectService.getAllProjects();
      const sorted = projectService.sortProjects(allProjects, "newest");

      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].createdAt).getTime();
        const curr = new Date(sorted[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe("Search consistency", () => {
    it("should find projects by name search and be retrievable by ID", () => {
      const allProjects = projectService.getAllProjects();
      const searchTerm = allProjects[0].name.substring(0, 3);

      const searchResults = projectService.searchProjects(searchTerm);
      expect(searchResults.length).toBeGreaterThan(0);

      for (const project of searchResults.slice(0, 3)) {
        const detailProject = projectService.getProjectById(project.id);
        expect(detailProject).toBeDefined();
        const matchesName = detailProject?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDesc = detailProject?.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTags = detailProject?.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        expect(matchesName || matchesDesc || matchesTags).toBe(true);
      }
    });
  });
});
