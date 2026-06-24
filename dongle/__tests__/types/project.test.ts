import { describe, it, expect } from "vitest";
import {
  PROJECT_CATEGORIES,
  CATEGORY_FORM_MAP,
  CATEGORY_DISPLAY_TO_FORM,
  CATEGORY_FORM_OPTIONS,
  ALL_CATEGORIES,
  normalizeCategory,
  isValidCategory,
  getValidCategories,
} from "@/types/project";

describe("Project Types and Categories", () => {
  describe("PROJECT_CATEGORIES", () => {
    it("should have all required categories", () => {
      expect(PROJECT_CATEGORIES.DEFI).toBe("DeFi / DEX");
      expect(PROJECT_CATEGORIES.GAMING).toBe("Gaming / NFT");
      expect(PROJECT_CATEGORIES.INFRASTRUCTURE).toBe("Infrastructure");
      expect(PROJECT_CATEGORIES.PAYMENTS).toBe("Payments");
      expect(PROJECT_CATEGORIES.DAO).toBe("DAO");
    });
  });

  describe("ALL_CATEGORIES", () => {
    it("should include All and all project categories", () => {
      expect(ALL_CATEGORIES).toContain("All");
      expect(ALL_CATEGORIES).toContain(PROJECT_CATEGORIES.DEFI);
      expect(ALL_CATEGORIES).toContain(PROJECT_CATEGORIES.GAMING);
      expect(ALL_CATEGORIES).toContain(PROJECT_CATEGORIES.INFRASTRUCTURE);
      expect(ALL_CATEGORIES).toContain(PROJECT_CATEGORIES.PAYMENTS);
      expect(ALL_CATEGORIES).toContain(PROJECT_CATEGORIES.DAO);
    });

    it("should have exactly 6 categories", () => {
      expect(ALL_CATEGORIES).toHaveLength(6);
    });
  });

  describe("CATEGORY_FORM_MAP", () => {
    it("should map form values to display categories", () => {
      expect(CATEGORY_FORM_MAP.defi).toBe(PROJECT_CATEGORIES.DEFI);
      expect(CATEGORY_FORM_MAP.gaming).toBe(PROJECT_CATEGORIES.GAMING);
      expect(CATEGORY_FORM_MAP.infrastructure).toBe(PROJECT_CATEGORIES.INFRASTRUCTURE);
      expect(CATEGORY_FORM_MAP.payments).toBe(PROJECT_CATEGORIES.PAYMENTS);
      expect(CATEGORY_FORM_MAP.dao).toBe(PROJECT_CATEGORIES.DAO);
    });

    it("should handle alternative form values", () => {
      expect(CATEGORY_FORM_MAP["defi-dex"]).toBe(PROJECT_CATEGORIES.DEFI);
      expect(CATEGORY_FORM_MAP.nfts).toBe(PROJECT_CATEGORIES.GAMING);
      expect(CATEGORY_FORM_MAP.tools).toBe(PROJECT_CATEGORIES.INFRASTRUCTURE);
      expect(CATEGORY_FORM_MAP.governance).toBe(PROJECT_CATEGORIES.DAO);
    });
  });

  describe("CATEGORY_DISPLAY_TO_FORM", () => {
    it("should map display categories to form values", () => {
      expect(CATEGORY_DISPLAY_TO_FORM[PROJECT_CATEGORIES.DEFI]).toBe("defi");
      expect(CATEGORY_DISPLAY_TO_FORM[PROJECT_CATEGORIES.GAMING]).toBe("gaming");
      expect(CATEGORY_DISPLAY_TO_FORM[PROJECT_CATEGORIES.INFRASTRUCTURE]).toBe("infrastructure");
      expect(CATEGORY_DISPLAY_TO_FORM[PROJECT_CATEGORIES.PAYMENTS]).toBe("payments");
      expect(CATEGORY_DISPLAY_TO_FORM[PROJECT_CATEGORIES.DAO]).toBe("dao");
    });
  });

  describe("CATEGORY_FORM_OPTIONS", () => {
    it("should provide form options with value and label", () => {
      expect(CATEGORY_FORM_OPTIONS).toHaveLength(5);
      expect(CATEGORY_FORM_OPTIONS[0]).toEqual({
        value: "defi",
        label: PROJECT_CATEGORIES.DEFI,
      });
    });

    it("should have all categories represented", () => {
      const values = CATEGORY_FORM_OPTIONS.map((opt) => opt.value);
      expect(values).toContain("defi");
      expect(values).toContain("gaming");
      expect(values).toContain("infrastructure");
      expect(values).toContain("payments");
      expect(values).toContain("dao");
    });
  });

  describe("normalizeCategory", () => {
    it("should normalize form values to canonical categories", () => {
      expect(normalizeCategory("defi")).toBe(PROJECT_CATEGORIES.DEFI);
      expect(normalizeCategory("gaming")).toBe(PROJECT_CATEGORIES.GAMING);
      expect(normalizeCategory("infrastructure")).toBe(PROJECT_CATEGORIES.INFRASTRUCTURE);
    });

    it("should handle case-insensitive input", () => {
      expect(normalizeCategory("DEFI")).toBe(PROJECT_CATEGORIES.DEFI);
      expect(normalizeCategory("Gaming")).toBe(PROJECT_CATEGORIES.GAMING);
      expect(normalizeCategory("INFRASTRUCTURE")).toBe(PROJECT_CATEGORIES.INFRASTRUCTURE);
    });

    it("should handle whitespace", () => {
      expect(normalizeCategory("  defi  ")).toBe(PROJECT_CATEGORIES.DEFI);
      expect(normalizeCategory("\tgaming\n")).toBe(PROJECT_CATEGORIES.GAMING);
    });

    it("should return null for invalid categories", () => {
      expect(normalizeCategory("invalid")).toBeNull();
      expect(normalizeCategory("unknown")).toBeNull();
      expect(normalizeCategory("")).toBeNull();
    });

    it("should handle alternative form values", () => {
      expect(normalizeCategory("defi-dex")).toBe(PROJECT_CATEGORIES.DEFI);
      expect(normalizeCategory("nfts")).toBe(PROJECT_CATEGORIES.GAMING);
      expect(normalizeCategory("tools")).toBe(PROJECT_CATEGORIES.INFRASTRUCTURE);
    });
  });

  describe("isValidCategory", () => {
    it("should validate canonical categories", () => {
      expect(isValidCategory(PROJECT_CATEGORIES.DEFI)).toBe(true);
      expect(isValidCategory(PROJECT_CATEGORIES.GAMING)).toBe(true);
      expect(isValidCategory(PROJECT_CATEGORIES.INFRASTRUCTURE)).toBe(true);
      expect(isValidCategory(PROJECT_CATEGORIES.PAYMENTS)).toBe(true);
      expect(isValidCategory(PROJECT_CATEGORIES.DAO)).toBe(true);
    });

    it("should reject invalid categories", () => {
      expect(isValidCategory("invalid")).toBe(false);
      expect(isValidCategory("defi")).toBe(false);
      expect(isValidCategory("All")).toBe(false);
    });
  });

  describe("getValidCategories", () => {
    it("should return all valid categories excluding All", () => {
      const categories = getValidCategories();
      expect(categories).toHaveLength(5);
      expect(categories).toContain(PROJECT_CATEGORIES.DEFI);
      expect(categories).toContain(PROJECT_CATEGORIES.GAMING);
      expect(categories).toContain(PROJECT_CATEGORIES.INFRASTRUCTURE);
      expect(categories).toContain(PROJECT_CATEGORIES.PAYMENTS);
      expect(categories).toContain(PROJECT_CATEGORIES.DAO);
      expect(categories).not.toContain("All");
    });
  });

  describe("Category Consistency", () => {
    it("should have consistent mappings between form and display", () => {
      for (const [_formValue, displayCategory] of Object.entries(CATEGORY_FORM_MAP)) {
        if (isValidCategory(displayCategory)) {
          const reverseFormValue = CATEGORY_DISPLAY_TO_FORM[displayCategory];
          expect(reverseFormValue).toBeDefined();
        }
      }
    });

    it("should have all form options in the map", () => {
      for (const option of CATEGORY_FORM_OPTIONS) {
        expect(CATEGORY_FORM_MAP[option.value]).toBe(option.label);
      }
    });
  });
});
