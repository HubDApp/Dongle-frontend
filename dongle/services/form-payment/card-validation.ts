/**
 * Card validation helpers for form payment fields (Issue #552).
 * Raw PAN/CVC are validated client-side then tokenized via Stripe —
 * they are never sent to Dongle servers.
 */

import type {
  CardBrand,
  CardDetails,
  CardValidationResult,
  FormPaymentConfig,
} from "./types";
import { DEFAULT_PAYMENT_CONFIG } from "./types";

/** Luhn checksum used by major card networks. */
export function luhnCheck(number: string): boolean {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 12) return false;

  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(number: string): CardBrand {
  const digits = number.replace(/\D/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  if (/^3(?:0[0-5]|[68])/.test(digits)) return "diners";
  if (/^35/.test(digits)) return "jcb";
  if (/^62/.test(digits)) return "unionpay";
  return "unknown";
}

export function formatCardNumber(number: string): string {
  const digits = number.replace(/\D/g, "").slice(0, 19);
  const brand = detectCardBrand(digits);
  if (brand === "amex") {
    return digits.replace(/(\d{1,4})(\d{1,6})?(\d{1,5})?/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" "),
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function expectedCvcLength(brand: CardBrand): number {
  return brand === "amex" ? 4 : 3;
}

function expectedNumberLength(brand: CardBrand): number {
  if (brand === "amex") return 15;
  if (brand === "diners") return 14;
  return 16;
}

export function validateCardDetails(
  card: CardDetails,
  config: Partial<FormPaymentConfig> = {},
): CardValidationResult {
  const cfg = { ...DEFAULT_PAYMENT_CONFIG, ...config };
  const errors: CardValidationResult["errors"] = {};
  const digits = card.number.replace(/\D/g, "");
  const brand = detectCardBrand(digits);
  const last4 = digits.length >= 4 ? digits.slice(-4) : null;

  if (!digits) {
    errors.number = "Card number is required";
  } else if (digits.length < expectedNumberLength(brand) && brand !== "unknown") {
    errors.number = `Enter the full ${expectedNumberLength(brand)}-digit card number`;
  } else if (!luhnCheck(digits)) {
    errors.number = "Card number failed validation";
  }

  const month = Number(card.expMonth);
  const yearRaw = card.expYear.trim();
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (!card.expMonth || Number.isNaN(month) || month < 1 || month > 12) {
    errors.expMonth = "Enter a valid expiry month (01-12)";
  }
  if (!yearRaw || Number.isNaN(year) || year < currentYear || year > currentYear + 30) {
    errors.expYear = "Enter a valid expiry year";
  } else if (
    !errors.expMonth &&
    year === currentYear &&
    month < currentMonth
  ) {
    errors.expMonth = "Card has expired";
  }

  const cvc = card.cvc.replace(/\D/g, "");
  if (!cvc) {
    errors.cvc = "Security code is required";
  } else if (cvc.length !== expectedCvcLength(brand === "unknown" ? "visa" : brand)) {
    errors.cvc = `Enter the ${expectedCvcLength(brand === "unknown" ? "visa" : brand)}-digit security code`;
  }

  if (cfg.requirePostalCode && !card.postalCode?.trim()) {
    errors.postalCode = "Postal code is required";
  }

  if (Object.keys(errors).length > 0) {
    errors.card = "Please correct the highlighted card fields";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    brand: digits ? brand : null,
    last4,
  };
}

/** Map Stripe / network errors to clear user-facing copy. */
export function mapPaymentError(error: unknown): { message: string; code: string } {
  if (!error || typeof error !== "object") {
    return {
      message: "Payment could not be processed. Please try again.",
      code: "payment_unknown",
    };
  }

  const err = error as { code?: string; message?: string; type?: string };
  const code = err.code || err.type || "payment_failed";

  const messages: Record<string, string> = {
    card_declined: "Your card was declined. Try another card or contact your bank.",
    expired_card: "This card has expired. Use a different card.",
    incorrect_cvc: "The security code is incorrect.",
    incorrect_number: "The card number is incorrect.",
    insufficient_funds: "This card has insufficient funds.",
    processing_error: "A processing error occurred. Please try again in a moment.",
    rate_limit: "Too many payment attempts. Wait a moment and try again.",
    authentication_required: "Additional authentication is required to complete this payment.",
    invalid_request_error: "Payment request was invalid. Refresh and try again.",
  };

  return {
    code,
    message:
      messages[code] ||
      err.message ||
      "Payment could not be processed. Please try again.",
  };
}
