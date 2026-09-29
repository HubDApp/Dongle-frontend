import { describe, expect, it } from "vitest";
import {
  getFieldRequirements,
  isFieldRequired,
  getRequirementMessage,
} from "@/utils/form-requirements.util";

describe("conditional required fields (#543)", () => {
  it("keeps core fields always required", () => {
    const req = getFieldRequirements({ primaryCategory: "infrastructure" });
    expect(req.name.required).toBe(true);
    expect(req.primaryCategory.required).toBe(true);
    expect(req.description.required).toBe(true);
    expect(req.websiteUrl.required).toBe(true);
    expect(req.auditReportUrl.required).toBe(false);
    expect(req.docsUrl.required).toBe(false);
  });

  it("requires audit and docs for DeFi", () => {
    const req = getFieldRequirements({ primaryCategory: "defi" });
    expect(req.auditReportUrl.required).toBe(true);
    expect(req.docsUrl.required).toBe(true);
    expect(getRequirementMessage("auditReportUrl", { primaryCategory: "defi" })).toMatch(
      /DeFi/i,
    );
  });

  it("requires docs for Payments", () => {
    expect(isFieldRequired("docsUrl", { primaryCategory: "payments" })).toBe(true);
    expect(isFieldRequired("auditReportUrl", { primaryCategory: "payments" })).toBe(false);
  });

  it("requires logo for Gaming", () => {
    expect(isFieldRequired("logoUrl", { primaryCategory: "gaming" })).toBe(true);
    expect(isFieldRequired("logoUrl", { primaryCategory: "dao" })).toBe(false);
  });

  it("requires repository when contract addresses are present", () => {
    expect(
      isFieldRequired("githubUrl", {
        primaryCategory: "infrastructure",
        contractAddresses: ["C".padEnd(56, "A")],
      }),
    ).toBe(true);
    expect(
      isFieldRequired("githubUrl", {
        primaryCategory: "infrastructure",
        contractAddresses: ["", "  "],
      }),
    ).toBe(false);
  });

  it("requires bug bounty for DeFi when an audit URL is set", () => {
    expect(
      isFieldRequired("bugBountyUrl", {
        primaryCategory: "defi",
        auditReportUrl: "https://audit.example.com",
      }),
    ).toBe(true);
    expect(
      isFieldRequired("bugBountyUrl", {
        primaryCategory: "defi",
        auditReportUrl: "",
      }),
    ).toBe(false);
  });
});
