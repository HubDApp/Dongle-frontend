"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import { useDynamicForm } from "@/hooks/useDynamicForm";
import { useFormKeyboardNav } from "@/hooks/useFormKeyboardNav";
import { useFormFocusManagement } from "@/hooks/useFormFocusManagement";
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

  // Ref for the <form> element — used by keyboard nav and focus management
  const formRef = useRef<HTMLFormElement>(null);

  // Keyboard navigation: Enter advances fields, Escape resets the form
  useFormKeyboardNav(formRef, {
    onCancel: () => {
      if (viewingVersion != null) {
        setViewingVersion(null);
      } else {
        form.resetAnswers();
      }
    },
  });

  // Focus management: logical focus order, visible indicator, SR announcements
  const focusMgr = useFormFocusManagement(formRef);

  // When the form becomes ready, move focus to the first field
  useEffect(() => {
    if (form.ready) {
      // Small delay so the DOM has finished rendering sections
      const timer = setTimeout(() => focusMgr.focusFirstField(), 50);
      return () => clearTimeout(timer);
    }
  }, [form.ready, focusMgr]);

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

    if (!result.success) {
      // Move focus to first invalid field and announce the error count
      setTimeout(() => {
        focusMgr.focusNextError();
        const count = result.errors?.length ?? 0;
        focusMgr.announceToSR(
          count === 1
            ? "1 field requires attention."
            : `${count} fields require attention.`,
          "assertive",
        );
      }, 0);
      return;
    }

    focusMgr.announceToSR("Form submitted successfully.", "polite");
    router.push(
      `/forms/confirmation?c=${encodeURIComponent(result.submission.confirmationNumber)}`,
    );
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

        {/*
         * Focus management (Issue #528):
         *   • Focus moves logically via DOM order (natural tab order)
         *   • :focus-visible indicator defined in globals.css
         *   • Focus trap in modals handled by useModalFocusTrap (existing hook)
         *   • Escape exits focus trap (handled in useModalFocusTrap)
         *   • SR announcements via hidden aria-live regions (useFormFocusManagement)
         *
         * Keyboard navigation (Issue #527):
         *   Tab / Shift+Tab  — moves to next/previous field (native)
         *   Arrow keys        — handled natively by <select> elements
         *   Enter             — advances to next field; on last field focuses submit
         *   Escape            — resets answers (or closes historical view)
         */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
          aria-label={title}
        >
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
