import { describe, expect, it } from "vitest";
import {
  applyAnswerChange,
  demoIntakeSchema,
  getActivePaths,
  getVisibleSectionIds,
  pruneAnswersForPath,
  validatePath,
} from "@/services/form-builder";

describe("form branching (#542)", () => {
  it("reveals dApp section when project type is dapp", () => {
    const ids = getVisibleSectionIds(demoIntakeSchema, {
      projectType: "dapp",
    });
    expect(ids).toContain("basics");
    expect(ids).toContain("dapp-details");
    expect(ids).not.toContain("infra-details");
    expect(ids).not.toContain("other-details");
  });

  it("supports multiple independent paths", () => {
    expect(
      getVisibleSectionIds(demoIntakeSchema, { projectType: "infrastructure" }),
    ).toEqual(expect.arrayContaining(["basics", "infra-details"]));

    expect(
      getVisibleSectionIds(demoIntakeSchema, { projectType: "other" }),
    ).toEqual(expect.arrayContaining(["basics", "other-details"]));

    expect(getActivePaths(demoIntakeSchema, { projectType: "dapp" })).toHaveLength(
      1,
    );
  });

  it("validates only fields on the current path", () => {
    const incompleteDapp = validatePath(
      demoIntakeSchema,
      {
        projectName: "Alpha",
        projectType: "dapp",
        contactEmail: "a@b.com",
      },
      "en",
    );
    expect(incompleteDapp.valid).toBe(false);
    expect(incompleteDapp.errors.some((e) => e.fieldId === "contractId")).toBe(
      true,
    );
    // Infra fields must not be required on the dApp path
    expect(incompleteDapp.errors.some((e) => e.fieldId === "serviceRegion")).toBe(
      false,
    );
    expect(incompleteDapp.validatedFieldIds).toContain("contractId");
    expect(incompleteDapp.validatedFieldIds).not.toContain("uptimeSla");
  });

  it("clears hidden branch answers when going back and changing path", () => {
    const onDapp = {
      projectName: "Alpha",
      projectType: "dapp" as const,
      contactEmail: "a@b.com",
      contractId: "C".padEnd(56, "A"),
      websiteUrl: "https://example.com",
    };

    const switched = applyAnswerChange(
      demoIntakeSchema,
      onDapp,
      "projectType",
      "infrastructure",
    );

    expect(switched.projectType).toBe("infrastructure");
    expect(switched.contractId).toBeUndefined();
    expect(switched.websiteUrl).toBeUndefined();
    expect(switched.projectName).toBe("Alpha");

    const pruned = pruneAnswersForPath(demoIntakeSchema, {
      ...onDapp,
      projectType: "other",
    });
    expect(pruned.contractId).toBeUndefined();
  });

  it("accepts a complete path as valid", () => {
    const result = validatePath(
      demoIntakeSchema,
      {
        projectName: "Alpha",
        projectType: "infrastructure",
        contactEmail: "host@example.com",
        serviceRegion: "EU-West",
        uptimeSla: 99.9,
      },
      "en",
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
