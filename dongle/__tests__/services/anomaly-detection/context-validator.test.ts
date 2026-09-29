import { describe, expect, it } from "vitest";
import { ContextAwareValidator } from "@/services/anomaly-detection";

describe("ContextAwareValidator", () => {
  it("validates a field against its pattern", () => {
    const validator = new ContextAwareValidator();

    expect(
      validator.validate({
        formType: "project",
        fieldName: "slug",
        value: "valid-slug-1",
        pattern: /^[a-z0-9-]+$/,
        required: true,
      })
    ).toMatchObject({ valid: true, unusual: false, issues: [] });

    expect(
      validator.validate({
        formType: "project",
        fieldName: "slug",
        value: "Invalid Slug",
        pattern: /^[a-z0-9-]+$/,
      }).valid
    ).toBe(false);
  });

  it("detects values with shapes not seen in the field context", () => {
    const validator = new ContextAwareValidator();
    for (let index = 0; index < 5; index++) {
      validator.learnAcceptedValue("project", "slug", `project-${index}`);
    }

    expect(
      validator.validate({
        formType: "project",
        fieldName: "slug",
        value: "123456789",
      }).unusual
    ).toBe(true);
  });

  it("suggests corrections and incorporates corrected examples", () => {
    const validator = new ContextAwareValidator();
    validator.learnFromCorrection("project", "repository", "githb.com", "github.com");

    expect(
      validator.validate({
        formType: "project",
        fieldName: "repository",
        value: "githb.con",
      }).suggestions
    ).toEqual(["github.com"]);

    for (let index = 0; index < 4; index++) {
      validator.learnAcceptedValue("project", "repository", `github${index}.com`);
    }
    expect(
      validator.validate({
        formType: "project",
        fieldName: "repository",
        value: "github5.com",
      }).unusual
    ).toBe(false);
  });

  it("prefers corrections reinforced by repeated feedback", () => {
    const validator = new ContextAwareValidator();
    validator.learnFromCorrection("project", "repository", "githb.com", "github.com");
    validator.learnFromCorrection("project", "repository", "githb.com", "gitlab.com");
    validator.learnFromCorrection("project", "repository", "githb.com", "gitlab.com");

    expect(
      validator.validate({
        formType: "project",
        fieldName: "repository",
        value: "githb.com",
      }).suggestions
    ).toEqual(["gitlab.com"]);
  });

  it("keeps learned patterns isolated by form and field", () => {
    const validator = new ContextAwareValidator();
    for (let index = 0; index < 5; index++) {
      validator.learnAcceptedValue("project", "slug", `project-${index}`);
    }

    expect(
      validator.validate({
        formType: "review",
        fieldName: "slug",
        value: "123456789",
      }).unusual
    ).toBe(false);
  });
});