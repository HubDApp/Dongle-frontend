import { describe, it, expect } from "vitest";
import {
  VisibilityCondition,
  evaluateVisibility,
} from "@/lib/form-visibility";

describe("Form Field Visibility Conditions (Issue #507)", () => {
  describe("Field Operators", () => {
    it("evaluates equals and notEquals correctly", () => {
      const condition = VisibilityCondition.when("role").equals("admin");
      expect(condition.evaluate({ role: "admin" })).toBe(true);
      expect(condition.evaluate({ role: "user" })).toBe(false);

      const notAdmin = VisibilityCondition.when("role").notEquals("admin");
      expect(notAdmin.evaluate({ role: "user" })).toBe(true);
      expect(notAdmin.evaluate({ role: "admin" })).toBe(false);
    });

    it("evaluates in and notIn array inclusion", () => {
      const allowedCategories = VisibilityCondition.when("category").in(["defi", "infrastructure", "nft"]);
      expect(allowedCategories.evaluate({ category: "defi" })).toBe(true);
      expect(allowedCategories.evaluate({ category: "gaming" })).toBe(false);

      const disallowed = VisibilityCondition.when("category").notIn(["defi", "nft"]);
      expect(disallowed.evaluate({ category: "gaming" })).toBe(true);
      expect(disallowed.evaluate({ category: "defi" })).toBe(false);
    });

    it("evaluates numeric comparisons (greaterThan, lessThan, between)", () => {
      const gt10 = VisibilityCondition.when("amount").greaterThan(10);
      expect(gt10.evaluate({ amount: 15 })).toBe(true);
      expect(gt10.evaluate({ amount: 10 })).toBe(false);
      expect(gt10.evaluate({ amount: 5 })).toBe(false);

      const range = VisibilityCondition.when("score").between(1, 10);
      expect(range.evaluate({ score: 5 })).toBe(true);
      expect(range.evaluate({ score: 10 })).toBe(true);
      expect(range.evaluate({ score: 11 })).toBe(false);
    });

    it("evaluates isTruthy, isFalsy, isEmpty, isNotEmpty", () => {
      const truthy = VisibilityCondition.when("hasToken").isTruthy();
      expect(truthy.evaluate({ hasToken: true })).toBe(true);
      expect(truthy.evaluate({ hasToken: "yes" })).toBe(true);
      expect(truthy.evaluate({ hasToken: false })).toBe(false);
      expect(truthy.evaluate({ hasToken: null })).toBe(false);

      const empty = VisibilityCondition.when("description").isEmpty();
      expect(empty.evaluate({ description: "" })).toBe(true);
      expect(empty.evaluate({ description: "   " })).toBe(true);
      expect(empty.evaluate({ description: [] })).toBe(true);
      expect(empty.evaluate({ description: "hello" })).toBe(false);
    });

    it("evaluates regex matches and includes", () => {
      const startsWithCA = VisibilityCondition.when("contractId").matches(/^C[A-Z0-9]{4}/);
      expect(startsWithCA.evaluate({ contractId: "CA12345" })).toBe(true);
      expect(startsWithCA.evaluate({ contractId: "G12345" })).toBe(false);

      const arrayIncludes = VisibilityCondition.when("tags").includes("soroban");
      expect(arrayIncludes.evaluate({ tags: ["stellar", "soroban", "rust"] })).toBe(true);
      expect(arrayIncludes.evaluate({ tags: ["stellar"] })).toBe(false);
    });

    it("evaluates custom predicates", () => {
      const customRule = VisibilityCondition.when("amount").custom((val, form) => {
        return Number(val) > 100 && form.currency === "USDC";
      });

      expect(customRule.evaluate({ amount: 200, currency: "USDC" })).toBe(true);
      expect(customRule.evaluate({ amount: 50, currency: "USDC" })).toBe(false);
      expect(customRule.evaluate({ amount: 200, currency: "XLM" })).toBe(false);
    });
  });

  describe("Compound Logic: AND, OR, NOT", () => {
    it("evaluates AND conditions requiring all sub-conditions to match", () => {
      const rule = VisibilityCondition
        .when("hasContract").equals(true)
        .andWhen("network").equals("mainnet");

      expect(rule.evaluate({ hasContract: true, network: "mainnet" })).toBe(true);
      expect(rule.evaluate({ hasContract: true, network: "testnet" })).toBe(false);
      expect(rule.evaluate({ hasContract: false, network: "mainnet" })).toBe(false);
    });

    it("evaluates OR conditions requiring at least one sub-condition to match", () => {
      const rule = VisibilityCondition
        .when("role").equals("admin")
        .orWhen("isVerifiedMaintainer").equals(true);

      expect(rule.evaluate({ role: "admin", isVerifiedMaintainer: false })).toBe(true);
      expect(rule.evaluate({ role: "user", isVerifiedMaintainer: true })).toBe(true);
      expect(rule.evaluate({ role: "user", isVerifiedMaintainer: false })).toBe(false);
    });

    it("evaluates NOT inversion", () => {
      const condition = VisibilityCondition.when("isDraft").equals(true).negate();
      expect(condition.evaluate({ isDraft: false })).toBe(true);
      expect(condition.evaluate({ isDraft: true })).toBe(false);
    });
  });

  describe("Complex & Nested Conditions", () => {
    it("evaluates nested paths across deep objects and arrays", () => {
      const rule = VisibilityCondition
        .when("project.security.auditPassed").equals(true)
        .andWhen("contracts[0].verified").equals(true);

      const matchForm = {
        project: { security: { auditPassed: true } },
        contracts: [{ verified: true }],
      };
      const nonMatchForm = {
        project: { security: { auditPassed: true } },
        contracts: [{ verified: false }],
      };

      expect(rule.evaluate(matchForm)).toBe(true);
      expect(rule.evaluate(nonMatchForm)).toBe(false);
    });

    it("combines composite groups with VisibilityCondition.and and .or", () => {
      const condition = VisibilityCondition.and(
        VisibilityCondition.when("network").in(["testnet", "mainnet"]),
        VisibilityCondition.or(
          VisibilityCondition.when("tokenAddress").isNotEmpty(),
          VisibilityCondition.when("useDefaultToken").equals(true)
        )
      );

      expect(
        condition.evaluate({
          network: "testnet",
          tokenAddress: "CDXYZ",
          useDefaultToken: false,
        })
      ).toBe(true);

      expect(
        condition.evaluate({
          network: "testnet",
          tokenAddress: "",
          useDefaultToken: true,
        })
      ).toBe(true);

      expect(
        condition.evaluate({
          network: "testnet",
          tokenAddress: "",
          useDefaultToken: false,
        })
      ).toBe(false);

      expect(
        condition.evaluate({
          network: "futurenet",
          tokenAddress: "CDXYZ",
          useDefaultToken: false,
        })
      ).toBe(false);
    });
  });
});
