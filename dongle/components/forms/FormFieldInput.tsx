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

/**
 * Derive a human-readable format hint from the field definition.
 * Returns null when no hint is applicable.
 */
function getFormatHint(
  field: FormFieldDefinition,
  locale: LocaleCode,
): string | null {
  const v = field.validation;
  if (!v) return null;

  if (field.type === "email") {
    const hints: Record<string, string> = {
      en: "Format: name@domain.com",
      es: "Formato: nombre@dominio.com",
      pt: "Formato: nome@dominio.com",
    };
    return hints[locale] ?? hints.en;
  }

  if (field.type === "text" || field.type === "textarea") {
    if (v.pattern) {
      // Soroban contract ID pattern
      if (v.minLength === 56 && v.maxLength === 56) {
        const hints: Record<string, string> = {
          en: "Example: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
          es: "Ejemplo: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
          pt: "Exemplo: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
        };
        return hints[locale] ?? hints.en;
      }
      // URL pattern
      if (v.pattern.startsWith("^https?")) {
        const hints: Record<string, string> = {
          en: "Example: https://myapp.stellar.org",
          es: "Ejemplo: https://miapp.stellar.org",
          pt: "Exemplo: https://meuapp.stellar.org",
        };
        return hints[locale] ?? hints.en;
      }
    }
  }

  if (field.type === "number") {
    const parts: string[] = [];
    if (v.min !== undefined) parts.push(`min: ${v.min}`);
    if (v.max !== undefined) parts.push(`max: ${v.max}`);
    if (parts.length > 0) {
      const labels: Record<string, string> = { en: "Range", es: "Rango", pt: "Faixa" };
      return `${labels[locale] ?? labels.en}: ${parts.join(", ")}`;
    }
  }

  return null;
}

/**
 * Build an accessible description for character counters and limits.
 * Returns null when neither minLength nor maxLength is set.
 */
function getCharInfo(
  field: FormFieldDefinition,
  currentLength: number,
  locale: LocaleCode,
): { text: string; isWarning: boolean } | null {
  const v = field.validation;
  if (!v) return null;

  const { minLength, maxLength } = v;
  if (!minLength && !maxLength) return null;

  if (maxLength) {
    const remaining = maxLength - currentLength;
    const isWarning = remaining <= Math.ceil(maxLength * 0.1); // ≤ 10% left
    const labels: Record<string, (rem: number, max: number) => string> = {
      en: (r, m) => `${r} of ${m} characters remaining`,
      es: (r, m) => `${r} de ${m} caracteres restantes`,
      pt: (r, m) => `${r} de ${m} caracteres restantes`,
    };
    const fn = labels[locale] ?? labels.en;
    return { text: fn(remaining, maxLength), isWarning };
  }

  if (minLength && currentLength > 0 && currentLength < minLength) {
    const needed = minLength - currentLength;
    const labels: Record<string, (n: number) => string> = {
      en: (n) => `${n} more character${n === 1 ? "" : "s"} needed`,
      es: (n) => `${n} caracter${n === 1 ? "" : "es"} más necesario${n === 1 ? "" : "s"}`,
      pt: (n) => `Mais ${n} caracter${n === 1 ? "" : "es"} necessário${n === 1 ? "" : "s"}`,
    };
    const fn = labels[locale] ?? labels.en;
    return { text: fn(needed), isWarning: true };
  }

  return null;
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
  const hintId = `${inputId}-hint`;
  const charId = `${inputId}-char`;

  // Real-time derived inline hints
  const currentLength =
    typeof value === "string" ? value.length : 0;
  const charInfo = useMemo(
    () => getCharInfo(field, currentLength, locale),
    [field, currentLength, locale],
  );
  const formatHint = useMemo(
    () => getFormatHint(field, locale),
    [field, locale],
  );

  // Build aria-describedby to include all hint regions
  const describedByParts: string[] = [];
  if (copy.helpText) describedByParts.push(hintId);
  if (formatHint) describedByParts.push(`${inputId}-format`);
  if (charInfo) describedByParts.push(charId);
  if (error) describedByParts.push(errorId);
  const ariaDescribedBy = describedByParts.length > 0 ? describedByParts.join(" ") : undefined;

  const common = {
    id: inputId,
    name: field.id,
    "aria-invalid": Boolean(error) || undefined,
    "aria-describedby": ariaDescribedBy,
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
        <fieldset className="space-y-2" aria-describedby={ariaDescribedBy}>
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
            aria-describedby={ariaDescribedBy}
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

      {/* Inline help text */}
      {copy.helpText ? (
        <p id={hintId} className="text-xs text-zinc-500 dark:text-zinc-400">
          {copy.helpText}
        </p>
      ) : null}

      {/* Format hint — shown without error state */}
      {formatHint && !error ? (
        <p
          id={`${inputId}-format`}
          className="text-xs text-zinc-500 dark:text-zinc-400"
          aria-live="polite"
        >
          {formatHint}
        </p>
      ) : null}

      {/* Real-time character counter */}
      {charInfo ? (
        <p
          id={charId}
          aria-live="polite"
          aria-atomic="true"
          className={
            charInfo.isWarning
              ? "text-xs text-amber-600 dark:text-amber-400"
              : "text-xs text-zinc-500 dark:text-zinc-400"
          }
        >
          {charInfo.text}
        </p>
      ) : null}

      {/* Validation error */}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
