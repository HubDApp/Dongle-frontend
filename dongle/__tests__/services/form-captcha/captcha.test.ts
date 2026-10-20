import { describe, expect, it } from "vitest";
import {
  createAccessibleChallenge,
  executeCaptcha,
  hashAnswer,
  validateCaptchaOnSubmit,
  verifyAccessibleAnswer,
  verifyCaptchaToken,
} from "@/services/form-captcha";

describe("accessible challenge", () => {
  it("hashes answers consistently", () => {
    expect(hashAnswer("12")).toBe(hashAnswer(" 12 "));
    expect(hashAnswer("12")).not.toBe(hashAnswer("13"));
  });

  it("verifies accessible math challenges", () => {
    const challenge = createAccessibleChallenge();
    expect(challenge.question).toMatch(/What is \d+ \+ \d+\?/);
    // Brute is fine for small range in unit test — extract numbers
    const match = challenge.question.match(/(\d+) \+ (\d+)/);
    expect(match).not.toBeNull();
    const answer = String(Number(match![1]) + Number(match![2]));
    expect(verifyAccessibleAnswer(challenge, answer)).toBe(true);
    expect(verifyAccessibleAnswer(challenge, "999")).toBe(false);
  });
});

describe("executeCaptcha", () => {
  it("returns a mock v3 token when site key is missing", async () => {
    const result = await executeCaptcha("form_submit", { siteKey: "" });
    expect(result.success).toBe(true);
    expect(result.token).toMatch(/^mock_v3_/);
    expect(result.mode).toBe("v3");
  });

  it("short-circuits when captcha disabled", async () => {
    const result = await executeCaptcha("form_submit", { enabled: false });
    expect(result.token).toBe("captcha_disabled");
  });
});

describe("validateCaptchaOnSubmit", () => {
  it("accepts mock tokens", () => {
    const validation = validateCaptchaOnSubmit({
      success: true,
      token: "mock_v3_form_submit_abc",
      score: 0.9,
      mode: "v3",
      action: "form_submit",
    });
    expect(validation.valid).toBe(true);
    expect(validation.requiresChallenge).toBe(false);
  });

  it("requires challenge when token missing", () => {
    const validation = validateCaptchaOnSubmit(null);
    expect(validation.valid).toBe(false);
    expect(validation.requiresChallenge).toBe(true);
  });

  it("validates accessible mode with challenge answer", () => {
    const challenge = createAccessibleChallenge();
    const match = challenge.question.match(/(\d+) \+ (\d+)/)!;
    const answer = String(Number(match[1]) + Number(match[2]));
    const validation = validateCaptchaOnSubmit(
      {
        success: true,
        token: "accessible:1",
        score: null,
        mode: "accessible",
        action: "form_submit",
      },
      { mode: "accessible", challenge, accessibleAnswer: answer },
    );
    expect(validation.valid).toBe(true);
  });
});

describe("verifyCaptchaToken (server)", () => {
  it("accepts mock and accessible tokens without secret", async () => {
    const mock = await verifyCaptchaToken({ token: "mock_v3_x" });
    expect(mock.valid).toBe(true);

    const accessible = await verifyCaptchaToken({ token: "accessible:123" });
    expect(accessible.valid).toBe(true);
    expect(accessible.mode).toBe("accessible");
  });

  it("rejects empty tokens", async () => {
    const result = await verifyCaptchaToken({ token: "" });
    expect(result.valid).toBe(false);
  });
});
