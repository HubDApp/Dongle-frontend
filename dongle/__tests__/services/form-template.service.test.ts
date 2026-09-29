import { beforeEach, describe, expect, it, vi } from "vitest";
import { formTemplateService } from "@/services/form-template/form-template.service";
import { BUILT_IN_FORM_TEMPLATES } from "@/data/form-templates";

const WALLET = "G".padEnd(56, "A");

describe("form template service (#539 / #540)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
        statusText: "OK",
        status: 200,
      }),
    );
  });

  it("exposes multiple categorized built-in templates", () => {
    const builtIn = formTemplateService.getBuiltInTemplates();
    expect(builtIn.length).toBeGreaterThanOrEqual(5);
    expect(builtIn.every((t) => t.isBuiltIn)).toBe(true);
    const categories = new Set(builtIn.map((t) => t.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
  });

  it("saves a named user template and can load it", () => {
    const result = formTemplateService.saveAsTemplate(WALLET, "My DeFi", {
      name: "Swap",
      primaryCategory: "defi",
      tags: ["amm"],
      description: "A sample description for the template.",
      websiteUrl: "https://example.com",
      githubUrl: "",
      logoUrl: "",
      docsUrl: "https://docs.example.com",
      auditReportUrl: "",
      bugBountyUrl: "",
      contractAddresses: [],
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("My DeFi");

    const loaded = formTemplateService.getTemplateById(result.data!.id, WALLET);
    expect(loaded?.data.description).toContain("sample description");
  });

  it("searches templates by name and category", () => {
    const matches = formTemplateService.searchTemplates("lending", {
      category: "defi",
    });
    expect(matches.some((t) => t.id === "builtin-defi-lending")).toBe(true);

    const none = formTemplateService.searchTemplates("zzzz-not-found");
    expect(none).toHaveLength(0);
  });

  it("lists previews for the library UI", () => {
    const previews = formTemplateService.listPreviews();
    expect(previews.length).toBe(BUILT_IN_FORM_TEMPLATES.length);
    expect(previews[0]).toHaveProperty("fieldCount");
    expect(previews[0]).toHaveProperty("isBuiltIn", true);
  });

  it("deletes user templates but not via built-in ids", () => {
    const saved = formTemplateService.saveAsTemplate(WALLET, "Temp", {
      name: "",
      primaryCategory: "dao",
      tags: [],
      description: "Enough characters here.",
      websiteUrl: "https://x.com",
      githubUrl: "",
      logoUrl: "",
      docsUrl: "",
      auditReportUrl: "",
      bugBountyUrl: "",
      contractAddresses: [],
    });
    expect(saved.success).toBe(true);
    expect(formTemplateService.deleteTemplate(WALLET, saved.data!.id)).toBe(true);
    expect(formTemplateService.getTemplateById(saved.data!.id, WALLET)).toBeNull();
  });
});
