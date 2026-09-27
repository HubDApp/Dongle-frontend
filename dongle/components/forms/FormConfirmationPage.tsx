"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  buildSubmissionSummary,
  formatAnswerValue,
  getDefaultNextSteps,
  type FormSchemaSnapshot,
  type FormSubmissionRecord,
} from "@/services/form-builder";
import { formatSmartDate } from "@/lib/i18n/format";

interface FormConfirmationPageProps {
  submission: FormSubmissionRecord;
  schema: FormSchemaSnapshot;
  submitAnotherHref?: string;
}

export function FormConfirmationPage({
  submission,
  schema,
  submitAnotherHref = "/forms",
}: FormConfirmationPageProps) {
  const { t, locale } = useTranslation();
  const summary =
    Object.keys(submission.summaryLabels).length > 0
      ? Object.entries(submission.answers)
          .filter(([id]) => submission.summaryLabels[id])
          .map(([fieldId, value]) => ({
            fieldId,
            label: submission.summaryLabels[fieldId]!,
            value: formatAnswerValue(value),
          }))
      : buildSubmissionSummary(schema, submission.answers, locale);

  const nextSteps = getDefaultNextSteps(locale);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
        <CheckCircle2
          className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("forms.confirmation.successTitle")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          {t("forms.confirmation.successBody")}
        </p>
        <div className="mt-4 inline-flex flex-col items-center gap-1 rounded-xl bg-white/80 px-4 py-3 dark:bg-zinc-950/60">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("forms.confirmation.confirmationNumber")}
          </span>
          <span
            className="font-mono text-lg font-semibold tracking-wider text-zinc-900 dark:text-zinc-50"
            data-testid="confirmation-number"
          >
            {submission.confirmationNumber}
          </span>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          {t("forms.confirmation.submittedAt", {
            date: formatSmartDate(new Date(submission.submittedAt)),
          })}
        </p>
      </div>

      <section aria-labelledby="submission-summary-heading" className="space-y-3">
        <h2
          id="submission-summary-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {t("forms.confirmation.summaryTitle")}
        </h2>
        <dl className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {summary.map((row) => (
            <div
              key={row.fieldId}
              className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4"
            >
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {row.label}
              </dt>
              <dd className="sm:col-span-2 text-sm text-zinc-900 dark:text-zinc-100">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="next-steps-heading" className="space-y-3">
        <h2
          id="next-steps-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {t("forms.confirmation.nextStepsTitle")}
        </h2>
        <ol className="space-y-3">
          {nextSteps.map((step, index) => (
            <li
              key={step.id}
              className="rounded-xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {index + 1}. {step.title}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {step.description}
              </p>
              {step.href ? (
                <Link
                  href={step.href}
                  className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {t("forms.confirmation.openLink")}
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={submitAnotherHref}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          {t("forms.confirmation.submitAnother")}
        </Link>
        <Link
          href="/discover"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t("forms.confirmation.backHome")}
        </Link>
      </div>
    </div>
  );
}
