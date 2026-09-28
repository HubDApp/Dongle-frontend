"use client";

import { useMemo } from "react";
import type { FormFieldDefinition, FormAnswers } from "@/services/form-builder";
import { resolveFieldCopy } from "@/services/form-builder";
import type { LocaleCode } from "@/lib/i18n/locales";

interface FormFieldInputProps {
  field: FormFieldDefinition;
  value: FormAnswers[string];
  error?: string;
  locale: LocaleCode;
  onChange: (value: FormAnswers[string]) => void;
}

export function FormFieldInput({
  field,
  value,
  error,
  locale,
  onChange,
}: FormFieldInputProps) {
  const copy = useMemo(() => resolveFieldCopy(field, locale), [field, locale]);
  const inputId = `form-field-${field.id}`;
  const errorId = `${inputId}-error`;

  const common = {
    id: inputId,
    name: field.id,
    "aria-invalid": Boolean(error) || undefined,
    "aria-describedby": error ? errorId : undefined,
    className:
      "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
  };

  let control: React.ReactNode;

  switch (field.type) {
    case "textarea":
      control = (
        <textarea
          {...common}
          rows={4}
          placeholder={copy.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "select":
      control = (
        <select
          {...common}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{copy.placeholder || "—"}</option>
          {copy.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
      break;
    case "radio":
      control = (
        <fieldset className="space-y-2" aria-describedby={error ? errorId : undefined}>
          <legend className="sr-only">{copy.label}</legend>
          {copy.options.map((opt) => {
            const optId = `${inputId}-${opt.value}`;
            return (
              <label
                key={opt.value}
                htmlFor={optId}
                className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200"
              >
                <input
                  id={optId}
                  name={field.id}
                  type="radio"
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="h-4 w-4 border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                {opt.label}
              </label>
            );
          })}
        </fieldset>
      );
      break;
    case "number":
      control = (
        <input
          {...common}
          type="number"
          placeholder={copy.placeholder}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      );
      break;
    case "boolean":
    case "checkbox":
      control = (
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
          <input
            id={inputId}
            name={field.id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          {copy.label}
        </label>
      );
      break;
    case "email":
      control = (
        <input
          {...common}
          type="email"
          placeholder={copy.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    default:
      control = (
        <input
          {...common}
          type="text"
          placeholder={copy.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  const hideOuterLabel = field.type === "boolean" || field.type === "checkbox";

  return (
    <div className="space-y-1.5">
      {!hideOuterLabel && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-zinc-800 dark:text-zinc-100"
        >
          {copy.label}
          {field.validation?.required ? (
            <span className="ml-0.5 text-red-500" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      )}
      {control}
      {copy.helpText ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{copy.helpText}</p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
