/**
 * Unit tests for form payment card validation (Issue #552).
 */

import { describe, expect, it } from "vitest";
import {
  detectCardBrand,
  formatCardNumber,
  luhnCheck,
  mapPaymentError,
  validateCardDetails,
} from "@/services/form-payment";

describe("luhnCheck", () => {
  it("accepts known valid test PANs", () => {
    expect(luhnCheck("4242424242424242")).toBe(true);
    expect(luhnCheck("4000056655665556")).toBe(true);
  });

  it("rejects invalid numbers", () => {
    expect(luhnCheck("4242424242424241")).toBe(false);
    expect(luhnCheck("1234")).toBe(false);
  });
});

describe("detectCardBrand / formatCardNumber", () => {
  it("detects visa and formats groups of four", () => {
    expect(detectCardBrand("4242424242424242")).toBe("visa");
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
  });

  it("detects amex", () => {
    expect(detectCardBrand("378282246310005")).toBe("amex");
  });
});

describe("validateCardDetails", () => {
  it("returns field errors for incomplete cards", () => {
    const result = validateCardDetails({
      number: "",
      expMonth: "",
      expYear: "",
      cvc: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.number).toBeTruthy();
    expect(result.errors.cvc).toBeTruthy();
  });

  it("accepts a valid visa test card in the future", () => {
    const year = String(new Date().getFullYear() + 2);
    const result = validateCardDetails({
      number: "4242 4242 4242 4242",
      expMonth: "12",
      expYear: year,
      cvc: "123",
    });
    expect(result.valid).toBe(true);
    expect(result.brand).toBe("visa");
    expect(result.last4).toBe("4242");
  });

  it("requires postal code when configured", () => {
    const year = String(new Date().getFullYear() + 2);
    const result = validateCardDetails(
      {
        number: "4242424242424242",
        expMonth: "12",
        expYear: year,
        cvc: "123",
      },
      { requirePostalCode: true },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.postalCode).toMatch(/postal/i);
  });
});

describe("mapPaymentError", () => {
  it("maps stripe decline codes to clear messages", () => {
    expect(mapPaymentError({ code: "card_declined" }).message).toMatch(/declined/i);
    expect(mapPaymentError({ code: "incorrect_cvc" }).message).toMatch(/security code/i);
  });
});
