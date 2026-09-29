import { beforeEach, describe, expect, it } from "vitest";
import {
  buildSubmissionSummary,
  clearSubmissions,
  demoIntakeSchema,
  generateConfirmationNumber,
  getDefaultNextSteps,
  getLastConfirmationNumber,
  getSubmission,
  submitForm,
} from "@/services/form-builder";

beforeEach(() => {
  window.localStorage.clear();
  clearSubmissions();
});

describe("form submission confirmation (#548)", () => {
  const validAnswers = {
    projectName: "Alpha",
    projectType: "other" as const,
    contactEmail: "a@b.com",
    otherDescription: "Building something useful on Stellar network.",
  };

  it("generates confirmation numbers", () => {
    const a = generateConfirmationNumber();
    const b = generateConfirmationNumber();
    expect(a).toMatch(/^DNG-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(a).not.toBe(b);
  });

  it("stores submission with confirmation number and summary", () => {
    const result = submitForm(demoIntakeSchema, validAnswers, {
      formVersion: 1,
      locale: "en",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.submission.confirmationNumber).toMatch(/^DNG-/);
    expect(getLastConfirmationNumber()).toBe(
      result.submission.confirmationNumber,
    );
    expect(getSubmission(result.submission.confirmationNumber)?.answers.projectName).toBe(
      "Alpha",
    );

    const summary = buildSubmissionSummary(
      demoIntakeSchema,
      result.submission.answers,
      "en",
    );
    expect(summary.some((row) => row.label === "Project name")).toBe(true);
    expect(summary.some((row) => row.value === "Alpha")).toBe(true);
  });

  it("exposes next steps for the confirmation page", () => {
    const steps = getDefaultNextSteps("en");
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps[0]?.title).toMatch(/Review/i);
  });

  it("rejects invalid submissions without creating a confirmation", () => {
    const result = submitForm(
      demoIntakeSchema,
      { projectName: "Alpha" },
      { formVersion: 1, locale: "en" },
    );
    expect(result.success).toBe(false);
    expect(getLastConfirmationNumber()).toBeNull();
  });
});
