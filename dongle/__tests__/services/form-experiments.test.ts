import { describe, it, expect, beforeEach } from "vitest";
import {
  normalCDF,
  calculateZTest,
  calculateConfidenceInterval95,
  hashString,
  assignVariant,
  getOrAssignVariant,
  trackExperimentEvent,
  computeExperimentResults,
  declareWinner,
  createExperiment,
  type FormExperiment,
} from "@/services/form-experiments";

describe("Form A/B Experimentation & Variation Testing System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Deterministic User Bucketing", () => {
    const testExperiment: FormExperiment = {
      id: "exp_test_form",
      name: "Form Layout Test",
      formId: "project-submit",
      status: "running",
      minSampleSize: 30,
      primaryMetric: "conversion_rate",
      createdAt: "2026-03-01T00:00:00Z",
      variants: [
        { id: "control", name: "Control", description: "Default", weight: 50, isControl: true },
        { id: "variant_b", name: "Variant B", description: "Step flow", weight: 50, isControl: false },
      ],
    };

    it("assigns users consistently and deterministically", () => {
      // Same user always receives the exact same variant
      const variantUser1 = assignVariant(testExperiment, "user_alpha_123");
      const variantUser1Repeat = assignVariant(testExperiment, "user_alpha_123");
      expect(variantUser1.id).toBe(variantUser1Repeat.id);

      const variantUser2 = assignVariant(testExperiment, "user_beta_456");
      const variantUser2Repeat = assignVariant(testExperiment, "user_beta_456");
      expect(variantUser2.id).toBe(variantUser2Repeat.id);
    });

    it("distributes a large population of users across weights", () => {
      let countControl = 0;
      let countVariantB = 0;

      for (let i = 0; i < 200; i++) {
        const v = assignVariant(testExperiment, `user_${i}`);
        if (v.id === "control") countControl++;
        else countVariantB++;
      }

      // Both variants should receive roughly 50% (+- 15%)
      expect(countControl).toBeGreaterThan(70);
      expect(countVariantB).toBeGreaterThan(70);
    });
  });

  describe("Statistical Significance & Hypothesis Testing", () => {
    it("computes normal CDF accurately", () => {
      expect(normalCDF(0)).toBeCloseTo(0.5, 3);
      expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
      expect(normalCDF(-1.96)).toBeCloseTo(0.025, 2);
    });

    it("computes 95% Wilson confidence intervals", () => {
      // 50 conversions in 100 trials -> 50%
      const [lower, upper] = calculateConfidenceInterval95(50, 100);
      expect(lower).toBeLessThan(0.5);
      expect(upper).toBeGreaterThan(0.5);
      expect(lower).toBeGreaterThan(0.35);
      expect(upper).toBeLessThan(0.65);
    });

    it("performs two-proportion Z-test and flags statistical significance", () => {
      // Control: 20 conversions out of 100 (20%)
      // Variant: 45 conversions out of 100 (45%)
      // This is a massive lift (+125%) that should easily achieve p < 0.05
      const zTest = calculateZTest(45, 100, 20, 100);

      expect(zTest.liftVsControlPercent).toBe(125);
      expect(zTest.zScore).toBeGreaterThan(2.5);
      expect(zTest.pValue).toBeLessThan(0.01);
      expect(zTest.isStatisticallySignificant).toBe(true);
      expect(zTest.confidenceLevel).toBeGreaterThanOrEqual(99);
    });

    it("handles non-significant slight differences properly", () => {
      // Control: 20 of 100
      // Variant: 21 of 100
      const zTest = calculateZTest(21, 100, 20, 100);
      expect(zTest.isStatisticallySignificant).toBe(false);
      expect(zTest.pValue).toBeGreaterThan(0.5);
    });
  });

  describe("Experiment Metrics & Results Engine", () => {
    it("tracks events and updates conversion rates", () => {
      const exp = createExperiment({
        name: "CTA Button Test",
        formId: "test-form",
        minSampleSize: 20,
        primaryMetric: "conversion_rate",
        variants: [
          { id: "control", name: "Green Button", description: "Default", weight: 50, isControl: true },
          { id: "variant_blue", name: "Blue Button", description: "Blue", weight: 50, isControl: false },
        ],
      });

      // Track impressions and conversions for control
      trackExperimentEvent(exp.id, "control", "impression");
      trackExperimentEvent(exp.id, "control", "start");
      trackExperimentEvent(exp.id, "control", "submission", 25000);

      // Track for variant
      trackExperimentEvent(exp.id, "variant_blue", "impression");
      trackExperimentEvent(exp.id, "variant_blue", "start");

      const results = computeExperimentResults(exp.id);
      expect(results).not.toBeNull();
      expect(results?.variantStats["control"].metrics.submissions).toBe(1);
      expect(results?.variantStats["control"].conversionRate).toBe(1);
      expect(results?.variantStats["variant_blue"].metrics.submissions).toBe(0);
    });
  });

  describe("Winner Selection & Rollout", () => {
    it("declares winner and rolls it out to 100% of all future users", () => {
      const exp = createExperiment({
        name: "Header Layout Test",
        formId: "header-form",
        minSampleSize: 20,
        primaryMetric: "conversion_rate",
        variants: [
          { id: "control", name: "Control", description: "Default", weight: 50, isControl: true },
          { id: "variant_clean", name: "Clean Header", description: "Clean", weight: 50, isControl: false },
        ],
      });

      // Declare winner
      const updated = declareWinner(exp.id, "variant_clean", true);
      expect(updated?.winnerVariantId).toBe("variant_clean");
      expect(updated?.rolloutWinnerToAll).toBe(true);
      expect(updated?.status).toBe("completed");

      // Now all users should get variant_clean regardless of hash
      for (let i = 0; i < 20; i++) {
        const { variant } = getOrAssignVariant(exp.id, `user_test_${i}`);
        expect(variant.id).toBe("variant_clean");
      }
    });
  });
});
