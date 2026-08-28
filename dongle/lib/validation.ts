/** Reusable validation helpers for forms and service boundaries. */

import { isBlank } from "./string";

export function isRequired(value: string | null | undefined): boolean {
  return !isBlank(value);
}

export function hasLengthBetween(
  value: string | null | undefined,
  min: number,
  max: number,
): boolean {
  if (value == null) return false;
  const length = value.trim().length;
  return length >= min && length <= max;
}

export function hasMinLength(value: string | null | undefined, min: number): boolean {
  return value != null && value.trim().length >= min;
}

export function isValidEmail(value: string | null | undefined): boolean {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidHttpUrl(value: string | null | undefined): boolean {
  if (isBlank(value)) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}