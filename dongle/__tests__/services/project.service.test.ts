import { describe, it, expect } from "vitest";
import { projectService } from "@/services/project/project.service";
import { mockProjects } from "@/data/mockProjects";

describe("projectService", () => {
  it("returns all mock projects", () => {
    expect(projectService.getAllProjects()).toEqual(mockProjects);
  });

  it("finds a project by id", () => {
    const project = projectService.getProjectById(mockProjects[0].id);
    expect(project).toEqual(mockProjects[0]);
  });

  it("returns null for unknown project ids", () => {
    expect(projectService.getProjectById("missing-project")).toBeNull();
  });

  it("filters projects by category", () => {
    const category = mockProjects[0].category;
    const filtered = projectService.getProjectsByCategory(category);
    expect(filtered.every((project) => project.category === category)).toBe(true);
  });

  it("searches projects by name or description", () => {
    const target = mockProjects[0];
    const results = projectService.searchProjects(target.name.slice(0, 4));
    expect(results.some((project) => project.id === target.id)).toBe(true);
  });

  it("includes All in categories and unique project categories", () => {
    const categories = projectService.getCategories();
    expect(categories[0]).toBe("All");
    expect(new Set(categories).size).toBe(categories.length);
  });

  it("sorts projects by rating, popularity, and recency", () => {
    const byRating = projectService.sortProjects(mockProjects, "rating");
    expect(byRating[0].rating).toBeGreaterThanOrEqual(byRating[1].rating);

    const byPopular = projectService.sortProjects(mockProjects, "popular");
    expect(byPopular[0].reviews).toBeGreaterThanOrEqual(byPopular[1].reviews);

    const byNewest = projectService.sortProjects(mockProjects, "newest");
    expect(new Date(byNewest[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(byNewest[1].createdAt).getTime(),
    );
  });
});
