/**
 * Form multi-language helpers — resolve labels, placeholders, help, and
 * validation messages against the active locale with English fallback.
 */

import type { LocaleCode } from "@/lib/i18n/locales";
import type {
  FormFieldDefinition,
  FormSchemaSnapshot,
  FormSectionDefinition,
  LocalizedText,
} from "./types";

export function resolveLocalizedText(
  text: LocalizedText | undefined,
  locale: LocaleCode,
  fallback = "",
): string {
  if (!text) return fallback;
  return text[locale] ?? text.en ?? fallback;
}

export interface ResolvedFieldCopy {
  id: string;
  label: string;
  placeholder: string;
  helpText: string;
  options: Array<{ value: string; label: string }>;
  validationMessages: {
    required?: string;
    minLength?: string;
    maxLength?: string;
    min?: string;
    max?: string;
    pattern?: string;
    custom?: string;
  };
}

export interface ResolvedSectionCopy {
  id: string;
  title: string;
  description: string;
}

export function resolveFieldCopy(
  field: FormFieldDefinition,
  locale: LocaleCode,
): ResolvedFieldCopy {
  const messages = field.validation?.messages;
  return {
    id: field.id,
    label: resolveLocalizedText(field.label, locale),
    placeholder: resolveLocalizedText(field.placeholder, locale),
    helpText: resolveLocalizedText(field.helpText, locale),
    options: (field.options ?? []).map((opt) => ({
      value: opt.value,
      label: resolveLocalizedText(opt.label, locale),
    })),
    validationMessages: {
      required: messages?.required
        ? resolveLocalizedText(messages.required, locale)
        : undefined,
      minLength: messages?.minLength
        ? resolveLocalizedText(messages.minLength, locale)
        : undefined,
      maxLength: messages?.maxLength
        ? resolveLocalizedText(messages.maxLength, locale)
        : undefined,
      min: messages?.min ? resolveLocalizedText(messages.min, locale) : undefined,
      max: messages?.max ? resolveLocalizedText(messages.max, locale) : undefined,
      pattern: messages?.pattern
        ? resolveLocalizedText(messages.pattern, locale)
        : undefined,
      custom: messages?.custom
        ? resolveLocalizedText(messages.custom, locale)
        : undefined,
    },
  };
}

export function resolveSectionCopy(
  section: FormSectionDefinition,
  locale: LocaleCode,
): ResolvedSectionCopy {
  return {
    id: section.id,
    title: resolveLocalizedText(section.title, locale),
    description: resolveLocalizedText(section.description, locale),
  };
}

export function resolveFormTitle(
  schema: FormSchemaSnapshot,
  locale: LocaleCode,
): string {
  return resolveLocalizedText(schema.name, locale);
}

export function resolveFormDescription(
  schema: FormSchemaSnapshot,
  locale: LocaleCode,
): string {
  return resolveLocalizedText(schema.description, locale);
}

/**
 * Build a locale → field label map for confirmation summaries.
 */
export function buildAnswerSummaryLabels(
  schema: FormSchemaSnapshot,
  fieldIds: string[],
  locale: LocaleCode,
): Record<string, string> {
  const fieldById = new Map(schema.fields.map((f) => [f.id, f]));
  const labels: Record<string, string> = {};
  for (const id of fieldIds) {
    const field = fieldById.get(id);
    if (field) labels[id] = resolveLocalizedText(field.label, locale);
  }
  return labels;
}

/** Whether the schema declares support for a locale (always includes en). */
export function schemaSupportsLocale(
  schema: FormSchemaSnapshot,
  locale: LocaleCode,
): boolean {
  if (locale === "en") return true;
  return schema.supportedLocales.includes(locale);
}
