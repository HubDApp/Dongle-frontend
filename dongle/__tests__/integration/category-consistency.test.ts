import { describe, it, expect } from "vitest";
import {
  PROJECT_CATEGORIES,
  CATEGORY_FORM_MAP,
  CATEGORY_DISPLAY_TO_FORM,
  CATEGORY_FORM_OPTIONS,
  normalizeCategory,
  isValidCategory,
  getValidCategories,
} from "@/types/project";
import { projectService } from "@/services/project/project.service";

/**
 * Integration tests for category consistency across the app
 * Ensures categories work consistently in discovery, forms, filtering, and detail pages
 */
describe("Category System Consistency", () => {
  describe("Canonical category definitions", () => {
    it("should have one canonical category list", () => {
      const categories = Object.values(PROJECT_CATEGORIES);
      expect(categories).toHaveLength(5);
      expect(categories).toContain("DeFi / DEX");
      expect(categories).toContain("Gaming / NFT");
      expect(categories).toContain("Infrastructure");
      expect(categories).toContain("Payments");
      expect(categories).toContain("DAO");
    });

    it("should have matching form options", () => {
      expect(CATEGORY_FORM_OPTIONS).toHaveLength(5);

      for (const option of CATEGORY_FORM_OPTIONS) {
        // Each form option should map to a valid category
        expect(CATEGORY_FORM_MAP[option.value]).toBe(option.label);
        expect(isValidCategory(option.label)).toBe(true);
      }
    });

    it("should have bidirectional category mappings", () => {
      for (const displayCategory of Object.values(PROJECT_CATEGORIES)) {
        const formValue = CATEGORY_DISPLAY_TO_FORM[displayCategory];
        expect(formValue).toBeDefined();

        const backToDisplay = CATEGORY_FORM_MAP[formValue];
        expect(backToDisplay).toBe(displayCategory);
      }
    });
  });

  describe("Project data uses canonical categories", () => {
    it("should not have mixed category formats in projects", () => {
      const allProjects = projectService.getAllProjects();

      for (const project of allProjects) {
        // Each project category should be one of the canonical categories
        expect(isValidCategory(project.category)).toBe(
          true,
          `Project ${project.id} has invalid category: ${project.category}`
        );
      }
    });

    it("should use display format (not form format) in project data", () => {
      const allProjects = projectService.getAllProjects();
      const formValues = Object.keys(CATEGORY_FORM_MAP);

      for (const project of allProjects) {
        // Projects should never have form values like "defi", always display like "DeFi / DEX"
        expect(formValues).not.toContain(project.category);
      }
    });
  });

  describe("Category filtering works end-to-end", () => {
    it("should filter projects by all valid categories", () => {
      for (const displayCategory of Object.values(PROJECT_CATEGORIES)) {
        const filtered = projectService.getProjectsByCategory(displayCategory);

        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.every((p) => p.category === displayCategory)).toBe(true);
      }
    });

    it("should handle 'All' category correctly", () => {
      const all = projectService.getProjectsByCategory("All");
      const allProjects = projectService.getAllProjects();

      expect(all).toHaveLength(allProjects.length);
    });

    it("should filter consistently across discovery and detail", () => {
      const defProjects = projectService.getProjectsByCategory(
        PROJECT_CATEGORIES.DEFI
      );

      for (const project of defProjects.slice(0, 3)) {
        const detail = projectService.getProjectById(project.id);
        expect(detail?.category).toBe(PROJECT_CATEGORIES.DEFI);
      }
    });
  });

  describe("Form options map cleanly to display labels", () => {
    it("should normalize all form values to canonical categories", () => {
      for (const formValue of Object.keys(CATEGORY_FORM_MAP)) {
        const normalized = normalizeCategory(formValue);
        expect(normalized).toBeDefined();
        expect(isValidCategory(normalized!)).toBe(true);
      }
    });

    it("should provide form options for creating/editing projects", () => {
      const formOptions = CATEGORY_FORM_OPTIONS;

      expect(formOptions.length).toBeGreaterThan(0);

      for (const option of formOptions) {
        // Form value should normalize to its label
        expect(normalizeCategory(option.value)).toBe(option.label);
        // Label should be a valid category
        expect(isValidCategory(option.label)).toBe(true);
      }
    });

    it("should handle form submission with form values", () => {
      // Simulate form submission: user selects "defi" from dropdown
      const formValue = "defi";
      const displayLabel = CATEGORY_FORM_MAP[formValue];

      // When saved to project, should use display label
      expect(displayLabel).toBe(PROJECT_CATEGORIES.DEFI);
      expect(isValidCategory(displayLabel)).toBe(true);

      // Should appear correctly in discovery/detail
      const projectsWithCategory = projectService.getProjectsByCategory(displayLabel);
      expect(projectsWithCategory.length).toBeGreaterThan(0);
    });
  });

  describe("Category normalization handles edge cases", () => {
    it("should normalize case-insensitive form values", () => {
      expect(normalizeCategory("DEFI")).toBe(PROJECT_CATEGORIES.DEFI);
      expect(normalizeCategory("Defi")).toBe(PROJECT_CATEGORIES.DEFI);
      expect(normalizeCategory("gaming")).toBe(PROJECT_CATEGORIES.GAMING);
    });

    it("should normalize with whitespace", () => {
      expect(normalizeCategory("  defi  ")).toBe(PROJECT_CATEGORIES.DEFI);
      expect(normalizeCategory("\tgaming\n")).toBe(PROJECT_CATEGORIES.GAMING);
    });

    it("should handle alternative form values", () => {
      expect(normalizeCategory("defi-dex")).toBe(PROJECT_CATEGORIES.DEFI);
      expect(normalizeCategory("nfts")).toBe(PROJECT_CATEGORIES.GAMING);
      expect(normalizeCategory("tools")).toBe(PROJECT_CATEGORIES.INFRASTRUCTURE);
      expect(normalizeCategory("governance")).toBe(PROJECT_CATEGORIES.DAO);
    });

    it("should reject invalid categories", () => {
      expect(normalizeCategory("invalid")).toBeNull();
      expect(normalizeCategory("unknown")).toBeNull();
      expect(normalizeCategory("")).toBeNull();
    });
  });

  describe("Display and form conversions are reversible", () => {
    it("should convert display to form and back without loss", () => {
      for (const displayCategory of Object.values(PROJECT_CATEGORIES)) {
        const formValue = CATEGORY_DISPLAY_TO_FORM[displayCategory];
        const backToDisplay = CATEGORY_FORM_MAP[formValue];

        expect(backToDisplay).toBe(displayCategory);
      }
    });

    it("should handle all form values in reverse map", () => {
      const primaryFormValues = Object.keys(CATEGORY_DISPLAY_TO_FORM).map(
        (k) => CATEGORY_DISPLAY_TO_FORM[k as any]
      );

      for (const formValue of primaryFormValues) {
        const display = CATEGORY_FORM_MAP[formValue];
        expect(display).toBeDefined();
        expect(isValidCategory(display)).toBe(true);
      }
    });
  });

  describe("Sorting and searching use consistent categories", () => {
    it("should sort within category consistently", () => {
      const defiProjects = projectService.getProjectsByCategory(
        PROJECT_CATEGORIES.DEFI
      );
      const sorted = projectService.sortProjects(defiProjects, "rating");

      expect(sorted.every((p) => p.category === PROJECT_CATEGORIES.DEFI)).toBe(
        true
      );

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].rating).toBeGreaterThanOrEqual(sorted[i].rating);
      }
    });

    it("should search across consistent category field", () => {
      const allProjects = projectService.getAllProjects();
      const firstProjectName = allProjects[0].name;
      const searchResults = projectService.searchProjects(
        firstProjectName.substring(0, 3)
      );

      expect(searchResults.length).toBeGreaterThan(0);

      for (const result of searchResults) {
        // Search results should have valid categories
        expect(isValidCategory(result.category)).toBe(true);
      }
    });
  });

  describe("Valid categories function", () => {
    it("should return all canonical categories", () => {
      const validCategories = getValidCategories();

      expect(validCategories).toContain(PROJECT_CATEGORIES.DEFI);
      expect(validCategories).toContain(PROJECT_CATEGORIES.GAMING);
      expect(validCategories).toContain(PROJECT_CATEGORIES.INFRASTRUCTURE);
      expect(validCategories).toContain(PROJECT_CATEGORIES.PAYMENTS);
      expect(validCategories).toContain(PROJECT_CATEGORIES.DAO);
    });

    it("should not include pseudo-categories like 'All'", () => {
      const validCategories = getValidCategories();
      expect(validCategories).not.toContain("All");
    });
  });
});
