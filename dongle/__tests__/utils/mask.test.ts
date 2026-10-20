import { describe, it, expect } from "vitest";
import {
  stripNonDigits,
  formatPhone,
  isValidPhone,
  formatCreditCard,
  maskCreditCard,
  isValidCreditCard,
  formatSSN,
  maskSSN,
  isValidSSN,
} from "@/utils/mask.util";

// ---------------------------------------------------------------------------
// stripNonDigits
// ---------------------------------------------------------------------------

describe("stripNonDigits", () => {
  it("returns empty string for empty input", () => {
    expect(stripNonDigits("")).toBe("");
  });

  it("removes all non-digit characters", () => {
    expect(stripNonDigits("(555) 555-5555")).toBe("5555555555");
    expect(stripNonDigits("4111-1111-1111-1111")).toBe("4111111111111111");
    expect(stripNonDigits("123-45-6789")).toBe("123456789");
  });

  it("passes through digits only", () => {
    expect(stripNonDigits("5551234567")).toBe("5551234567");
  });

  it("handles mixed input with letters and symbols", () => {
    expect(stripNonDigits("abc555def!@#")).toBe("555");
  });
});

// ---------------------------------------------------------------------------
// formatPhone
// ---------------------------------------------------------------------------

describe("formatPhone", () => {
  it("returns empty for empty input", () => {
    expect(formatPhone("")).toBe("");
  });

  it("formats partial input progressively", () => {
    expect(formatPhone("5")).toBe("(5");
    expect(formatPhone("55")).toBe("(55");
    expect(formatPhone("555")).toBe("(555");
    expect(formatPhone("5551")).toBe("(555) 1");
    expect(formatPhone("55512")).toBe("(555) 12");
    expect(formatPhone("555123")).toBe("(555) 123");
    expect(formatPhone("5551234")).toBe("(555) 123-4");
  });

  it("formats full 10-digit phone number", () => {
    expect(formatPhone("5555555555")).toBe("(555) 555-5555");
  });

  it("strips non-digits before formatting", () => {
    expect(formatPhone("(555) 555-5555")).toBe("(555) 555-5555");
  });

  it("formats a raw digits-only string", () => {
    expect(formatPhone("5551234567")).toBe("(555) 123-4567");
  });
});

// ---------------------------------------------------------------------------
// isValidPhone
// ---------------------------------------------------------------------------

describe("isValidPhone", () => {
  it("returns true for 10-digit numbers", () => {
    expect(isValidPhone("5555555555")).toBe(true);
    expect(isValidPhone("(555) 555-5555")).toBe(true);
  });

  it("returns false for fewer than 10 digits", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("555")).toBe(false);
    expect(isValidPhone("555555555")).toBe(false);
  });

  it("returns false for more than 10 digits", () => {
    expect(isValidPhone("55555555555")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatCreditCard
// ---------------------------------------------------------------------------

describe("formatCreditCard", () => {
  it("returns empty for empty input", () => {
    expect(formatCreditCard("")).toBe("");
  });

  it("groups digits by 4 separated by dashes", () => {
    expect(formatCreditCard("4")).toBe("4");
    expect(formatCreditCard("4111")).toBe("4111");
    expect(formatCreditCard("411111")).toBe("4111-11");
    expect(formatCreditCard("4111111111111111")).toBe("4111-1111-1111-1111");
  });

  it("strips non-digits before formatting", () => {
    expect(formatCreditCard("4111-1111-1111-1111")).toBe("4111-1111-1111-1111");
  });
});

// ---------------------------------------------------------------------------
// maskCreditCard
// ---------------------------------------------------------------------------

describe("maskCreditCard", () => {
  it("returns empty for empty input", () => {
    expect(maskCreditCard("")).toBe("");
  });

  it("masks all digits when fewer than 4", () => {
    expect(maskCreditCard("1")).toBe("*");
    expect(maskCreditCard("12")).toBe("**");
    expect(maskCreditCard("123")).toBe("***");
  });

  it("shows digits when exactly 4 (no masking needed)", () => {
    expect(maskCreditCard("1234")).toBe("1234");
  });

  it("shows last 4 digits and masks the rest", () => {
    expect(maskCreditCard("4111111111111111")).toBe("****-****-****-1111");
  });

  it("handles partial input correctly", () => {
    expect(maskCreditCard("12345")).toBe("****-5");
    expect(maskCreditCard("123456")).toBe("****-56");
    expect(maskCreditCard("1234567")).toBe("****-567");
    expect(maskCreditCard("12345678")).toBe("****-5678");
  });

  it("strips non-digits before masking", () => {
    expect(maskCreditCard("4111-1111-1111-1111")).toBe("****-****-****-1111");
  });
});

// ---------------------------------------------------------------------------
// isValidCreditCard
// ---------------------------------------------------------------------------

describe("isValidCreditCard", () => {
  it("returns true for valid Visa number", () => {
    // 4111111111111111 passes Luhn check
    expect(isValidCreditCard("4111111111111111")).toBe(true);
  });

  it("returns true for valid Mastercard number", () => {
    // 5555555555554444 passes Luhn check
    expect(isValidCreditCard("5555555555554444")).toBe(true);
  });

  it("returns false for invalid number", () => {
    expect(isValidCreditCard("1234567890123456")).toBe(false);
  });

  it("returns false for too short number", () => {
    expect(isValidCreditCard("4111")).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(isValidCreditCard("")).toBe(false);
  });

  it("strips non-digits before validation", () => {
    expect(isValidCreditCard("4111-1111-1111-1111")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formatSSN
// ---------------------------------------------------------------------------

describe("formatSSN", () => {
  it("returns empty for empty input", () => {
    expect(formatSSN("")).toBe("");
  });

  it("formats partial input progressively", () => {
    expect(formatSSN("1")).toBe("1");
    expect(formatSSN("12")).toBe("12");
    expect(formatSSN("123")).toBe("123");
    expect(formatSSN("1234")).toBe("123-4");
    expect(formatSSN("12345")).toBe("123-45");
    expect(formatSSN("123456")).toBe("123-45-6");
  });

  it("formats full 9-digit SSN", () => {
    expect(formatSSN("123456789")).toBe("123-45-6789");
  });

  it("strips non-digits before formatting", () => {
    expect(formatSSN("123-45-6789")).toBe("123-45-6789");
  });
});

// ---------------------------------------------------------------------------
// maskSSN
// ---------------------------------------------------------------------------

describe("maskSSN", () => {
  it("returns empty for empty input", () => {
    expect(maskSSN("")).toBe("");
  });

  it("masks all but last 4 digits", () => {
    expect(maskSSN("123456789")).toBe("***-**-6789");
  });

  it("shows digits when 4 or fewer", () => {
    expect(maskSSN("1")).toBe("1");
    expect(maskSSN("12")).toBe("12");
    expect(maskSSN("123")).toBe("123");
    expect(maskSSN("1234")).toBe("1234");
  });

  it("handles partial input over 4 digits", () => {
    expect(maskSSN("12345")).toBe("***-**-2345");
    expect(maskSSN("123456")).toBe("***-**-3456");
    expect(maskSSN("1234567")).toBe("***-**-4567");
  });

  it("strips non-digits before masking", () => {
    expect(maskSSN("123-45-6789")).toBe("***-**-6789");
  });
});

// ---------------------------------------------------------------------------
// isValidSSN
// ---------------------------------------------------------------------------

describe("isValidSSN", () => {
  it("returns true for valid SSN", () => {
    expect(isValidSSN("123456789")).toBe(true);
  });

  it("returns false for fewer than 9 digits", () => {
    expect(isValidSSN("")).toBe(false);
    expect(isValidSSN("12345")).toBe(false);
  });

  it("returns false for all-zero groups", () => {
    expect(isValidSSN("000123456")).toBe(false);
    expect(isValidSSN("123005678")).toBe(false);
    expect(isValidSSN("1234500000")).toBe(false);
  });

  it("strips non-digits before validation", () => {
    expect(isValidSSN("123-45-6789")).toBe(true);
  });
});