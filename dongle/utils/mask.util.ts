/**
 * Utilities for masking and formatting sensitive form field data.
 *
 * Supported types:
 * - Phone   → (XXX) XXX-XXXX
 * - Credit card → ****-****-****-XXXX (last 4 visible)
 * - SSN     → ***-**-XXXX (last 4 visible)
 *
 * All functions work with digit-only input values. Use `stripNonDigits`
 * before passing user input to these formatters.
 */

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/** Retain only digit characters (0-9). */
export function stripNonDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// ---------------------------------------------------------------------------
// Phone number
// ---------------------------------------------------------------------------

/**
 * Format digits as a US phone number: (XXX) XXX-XXXX.
 * Returns the partially-formatted string for incomplete input.
 *
 * @example
 *   formatPhone("")        → ""
 *   formatPhone("5")       → "("
 *   formatPhone("55")      → "(55"
 *   formatPhone("555")     → "(555"
 *   formatPhone("5551")    → "(555) 1"
 *   formatPhone("555123")  → "(555) 123"
 *   formatPhone("5551234") → "(555) 123-4"
 *   formatPhone("5555555555") → "(555) 555-5555"
 */
export function formatPhone(raw: string): string {
  const digits = stripNonDigits(raw);
  if (digits.length === 0) return "";

  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6, 10);

  let result = `(${area}`;
  if (digits.length > 3) {
    result += `) ${mid}`;
  }
  if (digits.length > 6) {
    result += `-${last}`;
  }
  return result;
}

/**
 * Validate a US phone number (10 digits).
 */
export function isValidPhone(raw: string): boolean {
  const digits = stripNonDigits(raw);
  return digits.length === 10;
}

// ---------------------------------------------------------------------------
// Credit card
// ---------------------------------------------------------------------------

/**
 * Group digits into 4-4-4-4 format: XXXX-XXXX-XXXX-XXXX.
 *
 * @example
 *   formatCreditCard("")          → ""
 *   formatCreditCard("4")         → "4"
 *   formatCreditCard("4111")      → "4111"
 *   formatCreditCard("411111")    → "4111-11"
 *   formatCreditCard("4111111111111111") → "4111-1111-1111-1111"
 */
export function formatCreditCard(raw: string): string {
  const digits = stripNonDigits(raw);
  if (digits.length === 0) return "";

  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join("-");
}

/**
 * Return a masked credit-card string where only the last 4 digits are visible.
 *
 * @example
 *   maskCreditCard("4111111111111111") → "****-****-****-1111"
 *   maskCreditCard("4111")             → "****"
 *   maskCreditCard("")                 → ""
 */
export function maskCreditCard(raw: string): string {
  const digits = stripNonDigits(raw);
  if (digits.length === 0) return "";
  if (digits.length < 4) return "*".repeat(digits.length);
  if (digits.length === 4) return digits;

  const last4 = digits.slice(-4);
  const maskedCount = digits.length - 4;
  const groups: string[] = [];

  // Build masked groups of 4
  const fullGroups = Math.floor(maskedCount / 4);
  const remainder = maskedCount % 4;

  for (let i = 0; i < fullGroups; i++) {
    groups.push("****");
  }
  if (remainder > 0) {
    groups.push("*".repeat(remainder));
  }
  groups.push(last4);

  return groups.join("-");
}

/**
 * Validate a credit card number (13-19 digits, Luhn check).
 */
export function isValidCreditCard(raw: string): boolean {
  const digits = stripNonDigits(raw);
  if (digits.length < 13 || digits.length > 19) return false;

  // Luhn algorithm
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// ---------------------------------------------------------------------------
// Social Security Number
// ---------------------------------------------------------------------------

/**
 * Format digits as SSN: XXX-XX-XXXX.
 *
 * @example
 *   formatSSN("")         → ""
 *   formatSSN("1")        → "1"
 *   formatSSN("123")      → "123"
 *   formatSSN("12345")    → "123-45"
 *   formatSSN("123456789") → "123-45-6789"
 */
export function formatSSN(raw: string): string {
  const digits = stripNonDigits(raw);
  if (digits.length === 0) return "";

  const first = digits.slice(0, 3);
  const mid = digits.slice(3, 5);
  const last = digits.slice(5, 9);

  let result = first;
  if (digits.length > 3) {
    result += `-${mid}`;
  }
  if (digits.length > 5) {
    result += `-${last}`;
  }
  return result;
}

/**
 * Return a masked SSN string where only the last 4 digits are visible.
 * For fewer than 4 digits, the input is returned as-is.
 *
 * @example
 *   maskSSN("123456789") → "***-**-6789"
 *   maskSSN("12345")     → "***-**-2345"
 *   maskSSN("1234")      → "1234"
 *   maskSSN("")          → ""
 */
export function maskSSN(raw: string): string {
  const digits = stripNonDigits(raw);
  if (digits.length === 0) return "";

  // For 4 or fewer digits, show them as-is (same convention as maskCreditCard)
  if (digits.length <= 4) return digits;

  const last4 = digits.slice(-4);

  // Always produce the full SSN layout with masked prefix and visible last 4
  return `***-**-${last4}`;
}

/**
 * Validate a US SSN (9 digits, no all-zero groups).
 */
export function isValidSSN(raw: string): boolean {
  const digits = stripNonDigits(raw);
  if (digits.length !== 9) return false;

  // No group may be all zeros
  const g1 = digits.slice(0, 3);
  const g2 = digits.slice(3, 5);
  const g3 = digits.slice(5, 9);

  return g1 !== "000" && g2 !== "00" && g3 !== "0000";
}

// ---------------------------------------------------------------------------
// Generic
// ---------------------------------------------------------------------------

/**
 * Map of mask type to display formatter (for user-friendly display).
 */
export const displayFormatters: Record<
  "phone" | "credit-card" | "ssn",
  (raw: string) => string
> = {
  phone: formatPhone,
  "credit-card": maskCreditCard,
  ssn: maskSSN,
};

/**
 * Map of mask type to input formatter (formatting while typing — shows
 * characters for phone, masks for credit-card and SSN).
 */
export const inputFormatters: Record<
  "phone" | "credit-card" | "ssn",
  (raw: string) => string
> = {
  phone: formatPhone,
  "credit-card": formatCreditCard,
  ssn: formatSSN,
};

/** Supported mask types */
export type MaskType = keyof typeof displayFormatters;