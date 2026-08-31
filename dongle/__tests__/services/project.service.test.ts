import { describe, it, expect } from "vitest";
import { projectService } from "@/services/project/project.service";
import { mockProjects } from "@/data/mockProjects";

describe("projectService", () => {
  it("returns all mock projects", () => {
    const all = projectService.getAllProjects();
    expect(all.length).toEqual(mockProjects.length);
  });

  it("finds a project by id", () => {
    const project = projectService.getProjectById(mockProjects[0].id);
    expect(project?.id).toEqual(mockProjects[0].id);
  });

  it("returns null for unknown project ids", () => {
    expect(projectService.getProjectById("missing-project")).toBeNull();
  });

  it("filters projects by category", () => {
    const category = mockProjects[0].primaryCategory!;
    const filtered = projectService.getProjectsByCategory(category);
    expect(filtered.every((project) => project.primaryCategory === category)).toBe(true);
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

  describe("detectDuplicates", () => {
    const firstProject = mockProjects[0];

    it("returns no duplicates when name, domain, and repo are all unique", () => {
      const result = projectService.detectDuplicates({
        name: "Completely Unique Project Name",
        websiteUrl: "https://uniquedomain.example.com",
        githubUrl: "https://github.com/unique-owner/unique-repo",
      });
      expect(result.hasDuplicates).toBe(false);
      expect(result.matches).toHaveLength(0);
      expect(result.reasons).toHaveLength(0);
    });

    it("detects duplicate by identical name (case-insensitive)", () => {
      const target = mockProjects[0];
      const result = projectService.detectDuplicates({
        name: target.name.toUpperCase(),
        websiteUrl: "https://different.example.com",
      });
      expect(result.hasDuplicates).toBe(true);
      expect(result.matches.some((m) => m.id === target.id)).toBe(true);
      expect(result.reasons[0]).toContain(target.name);
      expect(result.reasons[0]).toContain("identical name");
    });

    it("detects duplicate by identical website domain (normalized)", () => {
      const target = mockProjects.find((p) => p.domain);
      if (!target || !target.domain) return;

      const result = projectService.detectDuplicates({
        name: "Different Name",
        websiteUrl: `https://${target.domain.toUpperCase()}/`,
      });
      expect(result.hasDuplicates).toBe(true);
      expect(result.matches.some((m) => m.id === target.id)).toBe(true);
      expect(result.reasons[0]).toContain("same website domain");
    });

    it("detects duplicate by identical repository URL (normalized)", () => {
      const target = mockProjects.find((p) => p.githubUrl);
      if (!target || !target.githubUrl) return;

      const result = projectService.detectDuplicates({
        name: "Different Name",
        websiteUrl: "https://different.example.com",
        githubUrl: target.githubUrl,
      });
      expect(result.hasDuplicates).toBe(true);
      expect(result.matches.some((m) => m.id === target.id)).toBe(true);
      expect(result.reasons[0]).toContain("same repository URL");
    });

    it("excludes the current project by ID when editing", () => {
      const target = mockProjects[0];
      const result = projectService.detectDuplicates({
        name: target.name,
        excludeProjectId: target.id,
      });
      expect(result.hasDuplicates).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it("handles name with extra whitespace", () => {
      const target = mockProjects[0];
      const result = projectService.detectDuplicates({
        name: `  ${target.name}  `,
      });
      expect(result.hasDuplicates).toBe(true);
      expect(result.matches.some((m) => m.id === target.id)).toBe(true);
    });

    it("returns empty result for empty optional fields", () => {
      const result = projectService.detectDuplicates({
        name: "Truly Unique Name 12345",
        websiteUrl: "",
        githubUrl: "",
      });
      expect(result.hasDuplicates).toBe(false);
    });

    it("does not match when only one field matches (e.g. name differs but domain matches a different project)", () => {
      const targetDomain = mockProjects.find((p) => p.domain)?.domain;
      if (!targetDomain) return;

      // Use a project with this domain but with a different name
      // We need to make sure the name doesn't match anything
      const target = mockProjects.find((p) => p.domain === targetDomain);
      if (!target) return;

      const result = projectService.detectDuplicates({
        name: target.name + "XYZ",
        websiteUrl: `https://${targetDomain}`,
      });
      expect(result.hasDuplicates).toBe(true);
      expect(result.reasons[0]).not.toContain("identical name");
      expect(result.reasons[0]).toContain("same website domain");
    });
  });
});
