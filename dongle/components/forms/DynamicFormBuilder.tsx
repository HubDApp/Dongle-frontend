"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import { useDynamicForm } from "@/hooks/useDynamicForm";
import {
  resolveFormDescription,
  resolveFormTitle,
  getVersion,
} from "@/services/form-builder";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { DynamicFormSections } from "./DynamicFormSections";
import { FormVersionHistory } from "./FormVersionHistory";

export function DynamicFormBuilder() {
  const { t } = useTranslation();
  const router = useRouter();
  const form = useDynamicForm();
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const displaySchema = useMemo(() => {
    if (viewingVersion == null) return form.schema;
    return getVersion(form.formId, viewingVersion)?.schema ?? form.schema;
  }, [form.formId, form.schema, viewingVersion]);

  const title = resolveFormTitle(displaySchema, form.locale);
  const description = resolveFormDescription(displaySchema, form.locale);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (viewingVersion != null && viewingVersion !== form.formVersion) {
      return;
    }
    setSubmitting(true);
    const result = form.submit();
    setSubmitting(false);
    if (result.success) {
      router.push(
        `/forms/confirmation?c=${encodeURIComponent(result.submission.confirmationNumber)}`,
      );
    }
  };

  if (!form.ready) {
    return (
      <p className="text-sm text-zinc-500" role="status">
        {t("common.loading")}
      </p>
    );
  }

  const isHistorical =
    viewingVersion != null && viewingVersion !== form.formVersion;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("forms.builder.badge", { version: form.formVersion })}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-zinc-500">
              {t("forms.i18n.languageToggle")}
            </span>
            <LanguageSelector />
          </div>
        </div>

        {isHistorical ? (
          <div
            role="status"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          >
            {t("forms.versioning.viewingHistorical", {
              version: viewingVersion!,
            })}{" "}
            <button
              type="button"
              className="font-medium underline"
              onClick={() => setViewingVersion(null)}
            >
              {t("forms.versioning.backToActive")}
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <DynamicFormSections
            sections={
              isHistorical
                ? displaySchema.sections
                : form.visibleSections
            }
            fields={displaySchema.fields}
            answers={isHistorical ? {} : form.answers}
            errors={isHistorical ? [] : form.errors}
            locale={form.locale}
            onChange={form.setAnswer}
          />

          {!isHistorical ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? t("common.loading") : t("common.submit")}
              </button>
              <button
                type="button"
                onClick={form.resetAnswers}
                className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {t("forms.builder.reset")}
              </button>
            </div>
          ) : null}
        </form>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
        <FormVersionHistory
          versions={form.versions}
          changelog={form.changelog}
          activeVersion={form.formVersion}
          viewingVersion={viewingVersion}
          onView={(version) => setViewingVersion(version)}
          onRevert={(version) => {
            form.revert(version);
            setViewingVersion(null);
          }}
        />
        <p className="text-xs text-zinc-500">{t("forms.builder.branchHint")}</p>
      </aside>
    </div>
  );
}
