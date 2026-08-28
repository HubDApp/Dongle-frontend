/** Common string formatting and normalization helpers. */

export function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function truncate(value: string, maxLength: number, suffix = "..."): string {
  if (maxLength < 1) return "";
  if (value.length <= maxLength) return value;
  if (suffix.length >= maxLength) return suffix.slice(0, maxLength);
  return `${value.slice(0, maxLength - suffix.length)}${suffix}`;
}

export function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

export function toKebabCase(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}