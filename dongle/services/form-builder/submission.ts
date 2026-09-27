/**
 * Form submission confirmation — confirmation numbers, summaries, next steps.
 */

import type { LocaleCode } from "@/lib/i18n/locales";
import {
  getVisibleFields,
  getVisibleSectionIds,
  validatePath,
} from "./branching";
import { buildAnswerSummaryLabels, resolveLocalizedText } from "./i18n";
import type {
  FormAnswers,
  FormNextStep,
  FormSchemaSnapshot,
  FormSubmissionRecord,
} from "./types";

export const FORM_SUBMISSION_STORAGE_KEY = "dongle_form_submissions";
export const LAST_CONFIRMATION_STORAGE_KEY = "dongle_form_last_confirmation";

const DEFAULT_NEXT_STEPS: FormNextStep[] = [
  {
    id: "review",
    title: {
      en: "Review your submission",
      es: "Revisa tu envío",
      pt: "Revise seu envio",
    },
    description: {
      en: "Keep your confirmation number. You may need it to follow up.",
      es: "Guarda tu número de confirmación. Puede que lo necesites más adelante.",
      pt: "Guarde seu número de confirmação. Você pode precisar dele depois.",
    },
  },
  {
    id: "discover",
    title: {
      en: "Explore projects",
      es: "Explorar proyectos",
      pt: "Explorar projetos",
    },
    description: {
      en: "Browse the Dongle catalog while we process your form.",
      es: "Explora el catálogo de Dongle mientras procesamos tu formulario.",
      pt: "Navegue no catálogo Dongle enquanto processamos seu formulário.",
    },
    href: "/discover",
  },
];

function randomSegment(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint8Array(length))
      : Uint8Array.from({ length }, () => Math.floor(Math.random() * 256));
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

/** Generate a human-friendly confirmation number, e.g. DNG-AB12-CD34. */
export function generateConfirmationNumber(prefix = "DNG"): string {
  return `${prefix}-${randomSegment(4)}-${randomSegment(4)}`;
}

function readSubmissions(): FormSubmissionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FORM_SUBMISSION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FormSubmissionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSubmissions(records: FormSubmissionRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORM_SUBMISSION_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore quota
  }
}

export function getSubmission(
  confirmationNumber: string,
): FormSubmissionRecord | null {
  return (
    readSubmissions().find((r) => r.confirmationNumber === confirmationNumber) ??
    null
  );
}

export function getLastConfirmationNumber(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_CONFIRMATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

const BOOLEAN_LABELS: Record<LocaleCode, { yes: string; no: string }> = {
  en: { yes: "Yes", no: "No" },
  es: { yes: "Sí", no: "No" },
  pt: { yes: "Sim", no: "Não" },
};

export function formatAnswerValue(
  value: FormAnswers[string],
  locale: LocaleCode = "en",
): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") {
    const labels = BOOLEAN_LABELS[locale] ?? BOOLEAN_LABELS.en;
    return value ? labels.yes : labels.no;
  }
  return String(value);
}

export function buildSubmissionSummary(
  schema: FormSchemaSnapshot,
  answers: FormAnswers,
  locale: LocaleCode,
): Array<{ fieldId: string; label: string; value: string }> {
  const fields = getVisibleFields(schema, answers);
  return fields.map((field) => ({
    fieldId: field.id,
    label: resolveLocalizedText(field.label, locale),
    value: formatAnswerValue(answers[field.id], locale),
  }));
}

export function getDefaultNextSteps(
  locale: LocaleCode,
): Array<{ id: string; title: string; description: string; href?: string }> {
  return DEFAULT_NEXT_STEPS.map((step) => ({
    id: step.id,
    title: resolveLocalizedText(step.title, locale),
    description: resolveLocalizedText(step.description, locale),
    href: step.href,
  }));
}

export interface SubmitFormOptions {
  formVersion: number;
  locale: LocaleCode;
  confirmationPrefix?: string;
}

export interface SubmitFormResult {
  success: true;
  submission: FormSubmissionRecord;
}

export interface SubmitFormFailure {
  success: false;
  errors: ReturnType<typeof validatePath>["errors"];
}

/**
 * Validate the current path, persist a submission, and return a confirmation
 * record suitable for the confirmation page.
 */
export function submitForm(
  schema: FormSchemaSnapshot,
  answers: FormAnswers,
  options: SubmitFormOptions,
): SubmitFormResult | SubmitFormFailure {
  const validation = validatePath(schema, answers, options.locale);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const visibleFields = getVisibleFields(schema, answers);
  const confirmationNumber = generateConfirmationNumber(options.confirmationPrefix);
  const submission: FormSubmissionRecord = {
    confirmationNumber,
    formId: schema.formId,
    formVersion: options.formVersion,
    answers: { ...answers },
    visibleSectionIds: getVisibleSectionIds(schema, answers),
    locale: options.locale,
    submittedAt: Date.now(),
    summaryLabels: buildAnswerSummaryLabels(
      schema,
      visibleFields.map((f) => f.id),
      options.locale,
    ),
  };

  const all = readSubmissions();
  all.unshift(submission);
  writeSubmissions(all.slice(0, 50));

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        LAST_CONFIRMATION_STORAGE_KEY,
        confirmationNumber,
      );
    } catch {
      // ignore
    }
  }

  return { success: true, submission };
}

export function clearSubmissions(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FORM_SUBMISSION_STORAGE_KEY);
    window.localStorage.removeItem(LAST_CONFIRMATION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
