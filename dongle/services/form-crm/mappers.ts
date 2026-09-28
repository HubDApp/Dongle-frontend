/**
 * Configurable CRM field mapping
 */

import type { CrmFieldMapping } from "./types";

function applyTransform(
  value: unknown,
  transform: CrmFieldMapping["transform"] = "none",
): unknown {
  if (value == null) return value;
  if (typeof value !== "string") return value;

  switch (transform) {
    case "lowercase":
      return value.toLowerCase();
    case "uppercase":
      return value.toUpperCase();
    case "trim":
      return value.trim();
    default:
      return value;
  }
}

/**
 * Map form submission data to a CRM payload using configurable field mappings.
 */
export function mapFormDataToCrm(
  data: Record<string, unknown>,
  mappings: CrmFieldMapping[],
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const mapping of mappings) {
    if (!(mapping.source in data)) continue;
    const raw = data[mapping.source];
    if (raw === undefined || raw === null || raw === "") continue;
    mapped[mapping.target] = applyTransform(raw, mapping.transform);
  }

  return mapped;
}

/**
 * Merge user-provided mappings over defaults (user wins on duplicate source).
 */
export function mergeFieldMappings(
  defaults: CrmFieldMapping[],
  overrides: CrmFieldMapping[],
): CrmFieldMapping[] {
  const bySource = new Map<string, CrmFieldMapping>();
  for (const mapping of defaults) {
    bySource.set(mapping.source, mapping);
  }
  for (const mapping of overrides) {
    bySource.set(mapping.source, mapping);
  }
  return Array.from(bySource.values());
}
