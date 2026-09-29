"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEMO_FORM_ID,
  applyAnswerChange,
  demoIntakeSchema,
  ensureInitialVersion,
  getActiveVersion,
  getChangelog,
  getVisibleSections,
  listVersions,
  publishVersion,
  revertToVersion,
  submitForm,
  validatePath,
  type FormAnswers,
  type FormChangelogEntry,
  type FormSchemaSnapshot,
  type FormVersionRecord,
  type PathValidationResult,
} from "@/services/form-builder";
import { useTranslation } from "@/lib/i18n/useTranslation";

export interface UseDynamicFormOptions {
  formId?: string;
  initialSchema?: FormSchemaSnapshot;
}

export function useDynamicForm(options: UseDynamicFormOptions = {}) {
  const formId = options.formId ?? DEMO_FORM_ID;
  const seedSchema = options.initialSchema ?? demoIntakeSchema;
  const { locale } = useTranslation();

  const [schema, setSchema] = useState<FormSchemaSnapshot>(seedSchema);
  const [formVersion, setFormVersion] = useState(1);
  const [versions, setVersions] = useState<FormVersionRecord[]>([]);
  const [changelog, setChangelog] = useState<FormChangelogEntry[]>([]);
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [errors, setErrors] = useState<PathValidationResult["errors"]>([]);
  const [ready, setReady] = useState(false);

  const refreshVersions = useCallback(() => {
    setVersions(listVersions(formId));
    setChangelog(getChangelog(formId));
    const active = getActiveVersion(formId);
    if (active) {
      setSchema(active.schema);
      setFormVersion(active.version);
    }
  }, [formId]);

  useEffect(() => {
    ensureInitialVersion(formId, seedSchema);
    refreshVersions();
    setReady(true);
  }, [formId, seedSchema, refreshVersions]);

  const visibleSections = useMemo(
    () => getVisibleSections(schema, answers),
    [schema, answers],
  );

  const setAnswer = useCallback(
    (fieldId: string, value: FormAnswers[string]) => {
      setAnswers((prev) => applyAnswerChange(schema, prev, fieldId, value));
      setErrors((prev) => prev.filter((e) => e.fieldId !== fieldId));
    },
    [schema],
  );

  const validate = useCallback(() => {
    const result = validatePath(schema, answers, locale);
    setErrors(result.errors);
    return result;
  }, [schema, answers, locale]);

  const submit = useCallback(() => {
    const result = submitForm(schema, answers, {
      formVersion,
      locale,
    });
    if (!result.success) {
      setErrors(result.errors);
      return result;
    }
    setErrors([]);
    return result;
  }, [schema, answers, formVersion, locale]);

  const publish = useCallback(
    (nextSchema: FormSchemaSnapshot, summary: string) => {
      const record = publishVersion(formId, nextSchema, summary);
      refreshVersions();
      return record;
    },
    [formId, refreshVersions],
  );

  const revert = useCallback(
    (version: number) => {
      const record = revertToVersion(formId, version);
      refreshVersions();
      return record;
    },
    [formId, refreshVersions],
  );

  const resetAnswers = useCallback(() => {
    setAnswers({});
    setErrors([]);
  }, []);

  return {
    ready,
    formId,
    schema,
    formVersion,
    versions,
    changelog,
    answers,
    errors,
    visibleSections,
    locale,
    setAnswer,
    validate,
    submit,
    publish,
    revert,
    resetAnswers,
    refreshVersions,
  };
}
