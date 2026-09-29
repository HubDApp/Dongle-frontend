"use client";

import { resolveSectionCopy, type FormSectionDefinition } from "@/services/form-builder";
import type { LocaleCode } from "@/lib/i18n/locales";
import { FormFieldInput } from "./FormFieldInput";
import type { FormAnswers, FormFieldDefinition, FieldValidationError } from "@/services/form-builder";

interface DynamicFormSectionsProps {
  sections: FormSectionDefinition[];
  fields: FormFieldDefinition[];
  answers: FormAnswers;
  errors: FieldValidationError[];
  locale: LocaleCode;
  onChange: (fieldId: string, value: FormAnswers[string]) => void;
}

export function DynamicFormSections({
  sections,
  fields,
  answers,
  errors,
  locale,
  onChange,
}: DynamicFormSectionsProps) {
  const fieldById = new Map(fields.map((f) => [f.id, f]));
  const errorByField = new Map(errors.map((e) => [e.fieldId, e.message]));

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const copy = resolveSectionCopy(section, locale);
        return (
          <section
            key={section.id}
            aria-labelledby={`section-${section.id}`}
            className="space-y-4 rounded-xl border border-zinc-200/80 bg-white/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <div>
              <h2
                id={`section-${section.id}`}
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {copy.title}
              </h2>
              {copy.description ? (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {copy.description}
                </p>
              ) : null}
            </div>
            <div className="space-y-4">
              {section.fieldIds.map((fieldId) => {
                const field = fieldById.get(fieldId);
                if (!field) return null;
                return (
                  <FormFieldInput
                    key={field.id}
                    field={field}
                    value={answers[field.id]}
                    error={errorByField.get(field.id)}
                    locale={locale}
                    onChange={(value) => onChange(field.id, value)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
