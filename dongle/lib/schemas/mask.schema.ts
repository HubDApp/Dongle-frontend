/**
 * Zod validation schemas for masked form fields (phone, credit card, SSN).
 *
 * Each schema validates the **digits-only** raw value emitted by the
 * `MaskedInput` component.
 */

import { z } from "zod";
import { isValidPhone, isValidCreditCard, isValidSSN, stripNonDigits } from "@/utils/mask.util";

// ---------------------------------------------------------------------------
// Phone
// ---------------------------------------------------------------------------

/**
 * Validates a US phone number (10 digits).
 * Accepts input with formatting (non-digits are stripped before checking).
 */
export const phoneSchema = z
  .string()
  .transform((val) => stripNonDigits(val))
  .refine((digits) => digits.length > 0, {
    message: "Phone number is required",
  })
  .refine((digits) => isValidPhone(digits), {
    message: "Please enter a valid 10-digit phone number",
  });

// ---------------------------------------------------------------------------
// Credit card
// ---------------------------------------------------------------------------

/**
 * Validates a credit card number (13–19 digits, Luhn check).
 * Accepts input with formatting (non-digits are stripped before checking).
 */
export const creditCardSchema = z
  .string()
  .transform((val) => stripNonDigits(val))
  .refine((digits) => digits.length > 0, {
    message: "Credit card number is required",
  })
  .refine((digits) => isValidCreditCard(digits), {
    message: "Please enter a valid credit card number",
  });

// ---------------------------------------------------------------------------
// Social Security Number
// ---------------------------------------------------------------------------

/**
 * Validates a US SSN (9 digits, no all-zero groups).
 * Accepts input with formatting (non-digits are stripped before checking).
 */
export const ssnSchema = z
  .string()
  .transform((val) => stripNonDigits(val))
  .refine((digits) => digits.length > 0, {
    message: "Social Security Number is required",
  })
  .refine((digits) => isValidSSN(digits), {
    message: "Please enter a valid 9-digit SSN",
  });

// ---------------------------------------------------------------------------
// Optional variants
// ---------------------------------------------------------------------------

export const optionalPhoneSchema = z
  .string()
  .transform((val) => stripNonDigits(val))
  .refine(
    (digits) => digits.length === 0 || isValidPhone(digits),
    { message: "Please enter a valid 10-digit phone number" },
  );

export const optionalCreditCardSchema = z
  .string()
  .transform((val) => stripNonDigits(val))
  .refine(
    (digits) => digits.length === 0 || isValidCreditCard(digits),
    { message: "Please enter a valid credit card number" },
  );

export const optionalSsnSchema = z
  .string()
  .transform((val) => stripNonDigits(val))
  .refine(
    (digits) => digits.length === 0 || isValidSSN(digits),
    { message: "Please enter a valid 9-digit SSN" },
  );