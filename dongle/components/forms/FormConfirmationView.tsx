"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormConfirmationPage } from "@/components/forms/FormConfirmationPage";
import {
  DEMO_FORM_ID,
  demoIntakeSchema,
  getActiveVersion,
  getLastConfirmationNumber,
  getSubmission,
  type FormSchemaSnapshot,
  type FormSubmissionRecord,
} from "@/services/form-builder";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function FormConfirmationView() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [submission, setSubmission] = useState<FormSubmissionRecord | null>(null);
  const [schema, setSchema] = useState<FormSchemaSnapshot>(demoIntakeSchema);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("c");
    const confirmation =
      fromQuery || getLastConfirmationNumber() || "";
    const record = confirmation ? getSubmission(confirmation) : null;
    setSubmission(record);
    const active = getActiveVersion(DEMO_FORM_ID);
    if (active) setSchema(active.schema);
    setReady(true);
  }, [searchParams]);

  if (!ready) {
    return (
      <p className="text-sm text-zinc-500" role="status">
        {t("common.loading")}
      </p>
    );
  }

  if (!submission) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("forms.confirmation.missingTitle")}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("forms.confirmation.missingBody")}
        </p>
        <Link
          href="/forms"
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t("forms.confirmation.submitAnother")}
        </Link>
      </div>
    );
  }

  return (
    <FormConfirmationPage
      submission={submission}
      schema={schema}
      submitAnotherHref="/forms"
    />
  );
}
