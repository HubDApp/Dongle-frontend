import { describe, it, expect } from "vitest";
import { projects, ALL_CATEGORIES } from "@/data/projects";

describe("projects data", () => {
  it("has at least one project", () => {
    expect(projects.length).toBeGreaterThan(0);
  });

  it("every project has required fields", () => {
    for (const p of projects) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(typeof p.rating).toBe("number");
      expect(typeof p.reviews).toBe("number");
      expect(p.createdAt).toBeTruthy();
    }
  });

  it("all project ids are unique", () => {
    const ids = projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ratings are between 0 and 5", () => {
    for (const p of projects) {
      expect(p.rating).toBeGreaterThanOrEqual(0);
      expect(p.rating).toBeLessThanOrEqual(5);
    }
  });

  it("createdAt values are valid ISO dates", () => {
    for (const p of projects) {
      expect(new Date(p.createdAt).toString()).not.toBe("Invalid Date");
    }
  });

  it("ALL_CATEGORIES includes 'All'", () => {
    expect(ALL_CATEGORIES).toContain("All");
  });

  it("every project category exists in ALL_CATEGORIES", () => {
    for (const p of projects) {
      expect(ALL_CATEGORIES).toContain(p.category);
    }
  });
});
