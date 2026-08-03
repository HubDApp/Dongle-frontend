import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { projectService } from "@/services/project/project.service";
import { projectStatusService } from "@/services/project/project-status.service";
import { mockProjects } from "@/data/mockProjects";

// The current Node/jsdom combo does not expose `localStorage` on the global
// object, so provide a tiny in-memory implementation for hermetic tests.
function createLocalStorageMock() {
  let store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("projectService", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("reflects persisted lifecycle-status overrides", () => {
    const project = mockProjects[0];
    projectStatusService.setProjectStatus(project.id, "archived");
    const all = projectService.getAllProjects();
    expect(all.find((p) => p.id === project.id)?.status).toBe("archived");
    expect(projectService.getProjectById(project.id)?.status).toBe("archived");
  });
});
