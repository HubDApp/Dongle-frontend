"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormField } from "@/components/ui/FormField";
import { FormTimeEstimate } from "@/components/ui/FormTimeEstimate";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TagInput } from "@/components/ui/TagInput";
import { sorobanService } from "@/services/stellar/soroban.service";
import { projectService } from "@/services/project/project.service";
import { projectSubmissionService } from "@/services/project/project-submission.service";
import { walletService } from "@/services/wallet/wallet.service";
import { generateProjectIdFromName } from "@/lib/project-id";
import { computeQualityScore, detectSuspiciousFlags } from "@/lib/submission-quality";
import { Rocket, CheckCircle2, Plus, X, GitCompare } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import TransactionProgressPanel from "@/components/transactions/TransactionProgressPanel";
import { useOnChainTransaction } from "@/hooks/useOnChainTransaction";
import { useDraft } from "@/hooks/useDraft";
import { DraftIndicator } from "@/components/projects/DraftIndicator";
import { SubmissionChecklist } from "@/components/projects/SubmissionChecklist";
import { SaveTemplateModal } from "@/components/projects/SaveTemplateModal";
import { FormTemplateLibrary } from "@/components/projects/FormTemplateLibrary";
import { useWallet } from "@/context/wallet.context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormExportMenu } from "@/components/ui/FormExportMenu";
import { FormValueComparison } from "@/components/ui/FormValueComparison";
import { FormSubmissionRetry } from "@/components/ui/FormSubmissionRetry";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { normalizeUrl, extractDomain } from "@/lib/url";
import { validateRepositoryUrl, normalizeRepositoryUrl } from "@/lib/repository";
import { CATEGORY_FORM_OPTIONS, CATEGORY_FORM_MAP } from "@/types/project";
import type { Project } from "@/types/project";
import { trackProjectSubmit } from "@/lib/analytics";
import { isValidSorobanContractId } from "@/lib/stellar-address";
import { isBlank } from "@/lib/string";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { logger } from "@/lib/logger";
import { ProjectFormContext } from "@/context/project-form.context";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { runFormIntegrations } from "@/services/form-integrations";

const urlSchema = z.string().transform((val, ctx) => {
  try {
    return normalizeUrl(val);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter a valid URL",
    });
    return z.NEVER;
  }
});

const optionalUrlSchema = z.string().transform((val, ctx) => {
  if (isBlank(val)) return "";
  try {
    return normalizeUrl(val);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter a valid URL",
    });
    return z.NEVER;
  }
});

const repositoryUrlSchema = z.string().transform((val, ctx) => {
  if (isBlank(val)) return "";
  
  const validation = validateRepositoryUrl(val);
  
  if (!validation.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: validation.error || "Invalid repository URL",
    });
    return z.NEVER;
  }
  
  return normalizeRepositoryUrl(val);
});

/**
 * Validates a single Soroban contract ID string.
 * Accepts an empty string (field left blank) or a valid 56-char C… address.
 */
const contractIdSchema = z.string().transform((val, ctx) => {
  if (isBlank(val)) return "";
  const normalized = val.trim().toUpperCase();
  if (!isValidSorobanContractId(normalized)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Invalid Soroban contract ID. Must be 56 characters starting with 'C' (A–Z, 2–7 only).",
    });
    return z.NEVER;
  }
  return normalized;
});

const projectSchema = z
  .object({
    name: z.string().min(3, "Project name must be at least 3 characters"),
    primaryCategory: z.string().min(1, "Please select a category"),
    tags: z.array(z.string()),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters")
      .max(500, "Description cannot exceed 500 characters"),
    websiteUrl: urlSchema,
    githubUrl: repositoryUrlSchema,
    logoUrl: optionalUrlSchema,
    docsUrl: optionalUrlSchema,
    auditReportUrl: optionalUrlSchema,
    bugBountyUrl: optionalUrlSchema,
    /**
     * Up to 5 optional Soroban contract addresses.
     * Each entry is either an empty string (ignored on save) or a valid 56-char
     * contract ID.  The array itself is always present; individual slots can be
     * left blank.
     */
    contractAddresses: z
      .array(contractIdSchema)
      .max(5, "You can add at most 5 contract addresses"),
  })
  .superRefine((data, ctx) => {
    const requirements = getFieldRequirements({
      primaryCategory: data.primaryCategory,
      contractAddresses: data.contractAddresses,
      auditReportUrl: data.auditReportUrl,
    });

    const ensurePresent = (
      field: keyof typeof requirements,
      value: string | undefined,
    ) => {
      const rule = requirements[field];
      if (!rule.required) return;
      if (!isBlank(value)) return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message:
          rule.message ??
          getRequirementMessage(field, data) ??
          "This field is required",
      });
    };

    ensurePresent("githubUrl", data.githubUrl);
    ensurePresent("logoUrl", data.logoUrl);
    ensurePresent("docsUrl", data.docsUrl);
    ensurePresent("auditReportUrl", data.auditReportUrl);
    ensurePresent("bugBountyUrl", data.bugBountyUrl);
  });

export type ProjectFormValues = z.infer<typeof projectSchema>;

/** Column order and headers for the form data export. */
const EXPORT_FIELDS: Array<keyof ProjectFormValues> = [
  "name",
  "primaryCategory",
  "tags",
  "description",
  "websiteUrl",
  "githubUrl",
  "logoUrl",
  "docsUrl",
  "auditReportUrl",
  "bugBountyUrl",
  "contractAddresses",
];

const EXPORT_LABELS: Record<string, string> = {
  name: "Project Name",
  primaryCategory: "Category",
  tags: "Tags",
  description: "Description",
  websiteUrl: "Project Website",
  githubUrl: "Repository URL",
  logoUrl: "Logo URL",
  docsUrl: "Documentation URL",
  auditReportUrl: "Audit Report URL",
  bugBountyUrl: "Bug Bounty URL",
  contractAddresses: "Contract Addresses",
};

type ProjectFormProps = {
  mode?: "create" | "edit";
  initialData?: Partial<ProjectFormValues> & { category?: string };
  projectId?: string;
  onSubmit?: (data: ProjectFormValues) => Promise<void>;
};

export default function ProjectForm({
  mode = "create",
  initialData,
  projectId,
  onSubmit: customOnSubmit,
}: ProjectFormProps = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isOpen: boolean;
    isExact: boolean;
    matches: Project[];
    reasons: string[];
    payload: ProjectFormValues & { domain?: string } | null;
  }>({ isOpen: false, isExact: false, matches: [], reasons: [], payload: null });
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [submissionError, setSubmissionError] = useState<Error | string | null>(null);
  const [submissionRetryCount, setSubmissionRetryCount] = useState(0);

  // A/B testing experiment for project submission layout and flow
  const experiment = useFormExperiment({
    experimentId: "project-submission-v2",
  });

  const router = useRouter();
  const { progress, run, retry, isInProgress } = useOnChainTransaction();
  const { publicKey } = useWallet();
  const { t, locale } = useTranslation();

  // Draft management – passes wallet address so drafts sync to the server
  const draft = useDraft({
    mode,
    projectId,
    autoSave: true,
    walletAddress: publicKey,
  });
  const [draftRestored, setDraftRestored] = React.useState(false);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const formType = mode === "edit" ? "project-edit" : "project-submission";
  const conversion = useFormConversion({
    formId: "project-form",
    formType,
  });
  const captcha = useFormCaptcha({ action: "project_submit" });
  const heatmap = useFormHeatmap({ formId: "project-form", formType });
  const sessionRecording = useFormSessionRecording({
    formId: "project-form",
    formType,
    autoStart: false,
  });

  const bindFormRef = useCallback(
    (node: HTMLFormElement | null) => {
      heatmap.formRef(node);
      sessionRecording.formRef(node);
    },
    [heatmap.formRef, sessionRecording.formRef],
  );

  const defaultFormValues: ProjectFormValues = {
    name: initialData?.name || "",
    primaryCategory: initialData?.primaryCategory || initialData?.category || "",
    tags: initialData?.tags || [],
    description: initialData?.description || "",
    websiteUrl: initialData?.websiteUrl || "",
    githubUrl: initialData?.githubUrl || "",
    logoUrl: initialData?.logoUrl || "",
    docsUrl: initialData?.docsUrl || "",
    auditReportUrl: initialData?.auditReportUrl || "",
    bugBountyUrl: initialData?.bugBountyUrl || "",
    contractAddresses: initialData?.contractAddresses?.length
      ? initialData.contractAddresses
      : [],
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    watch,
    getValues,
    setValue,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultFormValues,
  });



  // Show notification when draft is restored
  useEffect(() => {
    if (draft.loadedDraft) {
      setDraftRestored(true);
      reset(draft.loadedDraft);
    }
  }, [draft.loadedDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply template queued from /projects/templates
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("dongle_pending_form_template");
      if (!raw) return;
      sessionStorage.removeItem("dongle_pending_form_template");
      const data = JSON.parse(raw) as FormTemplate["data"];
      reset({
        name: data.name || "",
        primaryCategory: data.primaryCategory || "",
        tags: data.tags || [],
        description: data.description || "",
        websiteUrl: data.websiteUrl || "",
        githubUrl: data.githubUrl || "",
        logoUrl: data.logoUrl || "",
        docsUrl: data.docsUrl || "",
        auditReportUrl: data.auditReportUrl || "",
        bugBountyUrl: data.bugBountyUrl || "",
        contractAddresses: data.contractAddresses?.length
          ? data.contractAddresses
          : [],
      });
      toast.success("Template loaded into the form");
    } catch {
      // ignore invalid payload
    }
  }, [reset]);

  useUnsavedChanges(isDirty, isSubmitting);

  // Watch form values for checklist and auto-save.
  // react-hook-form's watch() is intentionally used here for live value access.
  // The React Compiler flags it as non-memoizable, but this component does not
  // rely on memoization of watchedValues — it's read-only for the checklist
  // and the draft autosave effect below.
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedValues = watch();
  const fieldRequirements = getFieldRequirements({
    primaryCategory: watchedValues.primaryCategory,
    contractAddresses: watchedValues.contractAddresses,
    auditReportUrl: watchedValues.auditReportUrl,
  });

  const fieldLabel = (
    base: string,
    field: keyof typeof fieldRequirements,
    optionalFallback = true,
  ) => {
    const rule = fieldRequirements[field];
    if (rule.required) return base;
    return optionalFallback ? `${base} (Optional)` : base;
  };

  // Auto-save draft when form changes — derive from watchedValues instead of
  // a watch() subscription to avoid the react-hooks/incompatible-library warning
  // that fires when RHF's watch callback is passed into a memoized hook.
  useEffect(() => {
    draft.saveDraft(watchedValues as ProjectFormValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues)]);

  const trackedFieldCount = 10 + (watchedValues.contractAddresses?.length ?? 0);
  const completedFieldCount = [
    watchedValues.name,
    watchedValues.primaryCategory,
    watchedValues.tags?.length,
    watchedValues.description,
    watchedValues.websiteUrl,
    watchedValues.githubUrl,
    watchedValues.logoUrl,
    watchedValues.docsUrl,
    watchedValues.auditReportUrl,
    watchedValues.bugBountyUrl,
    ...(watchedValues.contractAddresses ?? []),
  ].filter((value) =>
    typeof value === "string" ? value.trim().length > 0 : Boolean(value),
  ).length;

  const executeSubmit = useCallback(
    async (payload: ProjectFormValues & { domain?: string }) => {
      if (customOnSubmit) {
        return customOnSubmit(payload);
      }

      setIsSubmitting(true);
      try {
        // Strip any blank entries left in the contractAddresses list
        const cleanedPayload = {
          ...payload,
          contractAddresses: (payload.contractAddresses ?? []).filter(
            (a) => a.trim().length > 0,
          ),
        };
        const result = await run((onPhaseChange) => {
          // Normalize the form value (e.g. "defi") to its canonical display label
          // (e.g. "DeFi / DEX") before submitting to the contract.
          const canonicalCategory = CATEGORY_FORM_MAP[cleanedPayload.primaryCategory] ?? cleanedPayload.primaryCategory;
          const contractPayload = {
            ...cleanedPayload,
            category: canonicalCategory,
          };
          if (mode === "edit" && projectId) {
            return sorobanService.updateProject(projectId, contractPayload, { onPhaseChange });
          }
          return sorobanService.registerProject(contractPayload, { onPhaseChange });
        });

        if (result) {
          conversion.trackSuccess({ mode, project_id: projectId ?? null });
          heatmap.captureSnapshot();
          sessionRecording.stop();
          if (mode !== "edit") {
            const qualityScore = computeQualityScore(cleanedPayload);
            try {
              let submittedBy = "unknown";
              try {
                submittedBy = await walletService.getPublicKey();
              } catch {
                // wallet may disconnect after tx
              }

              const existingNames = projectService
                .getAllProjects()
                .map((p) => p.name);
              const flagReasons = detectSuspiciousFlags(
                cleanedPayload,
                qualityScore,
                existingNames,
              );

              projectSubmissionService.recordSubmission({
                projectId: generateProjectIdFromName(cleanedPayload.name),
                projectName: cleanedPayload.name,
                submittedBy,
                qualityScore,
                flagReasons,
              });

              // Fire-and-forget post-submit integrations (email / webhooks / CRM).
              // Failures are isolated inside the orchestrator and never block UX.
              const submissionId = generateProjectIdFromName(cleanedPayload.name);
              void runFormIntegrations({
                submissionId,
                formType: "project-submission",
                data: {
                  name: cleanedPayload.name,
                  projectName: cleanedPayload.name,
                  primaryCategory:
                    CATEGORY_FORM_MAP[cleanedPayload.primaryCategory] ??
                    cleanedPayload.primaryCategory,
                  websiteUrl: cleanedPayload.websiteUrl,
                  githubUrl: cleanedPayload.githubUrl,
                  description: cleanedPayload.description,
                  docsUrl: cleanedPayload.docsUrl,
                  logoUrl: cleanedPayload.logoUrl,
                },
                locale,
                metadata: {
                  submittedBy,
                  mode,
                },
              }).catch((integrationError) => {
                console.error(
                  "[ProjectForm] Form integrations failed:",
                  integrationError,
                );
              });
            } catch (moderationError) {
              console.error("[ProjectForm] Failed to record submission moderation:", moderationError);
            }
          }

          trackProjectSubmit({
            success: true,
            mode,
            category: CATEGORY_FORM_MAP[cleanedPayload.primaryCategory] ?? cleanedPayload.primaryCategory,
            projectId: mode === "edit" ? projectId : undefined,
          });
          experiment.trackSubmission();
          // Clear draft after successful submission
          draft.clearDraft();
          setSubmissionError(null);
          setSubmissionRetryCount(0);
          reset();
          if (mode !== "edit") {
            try {
              awardSubmission(
                publicKey,
                `${generateProjectIdFromName(cleanedPayload.name)}:${Date.now()}`,
                computeQualityScore(cleanedPayload),
              );
            } catch (gamificationError) {
              logger.error(
                "Failed to record submission rewards",
                { operation: "awardSubmission", userAction: "tracking submission rewards" },
                gamificationError,
              );
            }
          }
          const redirectPath =
            mode === "edit" && projectId ? `/projects/${projectId}` : "/";
          setTimeout(() => router.push(redirectPath), 1500);
        } else {
          setSubmissionError("Transaction could not be completed. Please review and retry.");
          trackProjectSubmit({
            success: false,
            mode,
            errorCode: "transaction_incomplete",
          });
          experiment.trackError();
        }
      } catch (error) {
        setSubmissionError(error instanceof Error ? error : String(error));
        logger.error("Soroban project operation failed", {
          operation: mode === "edit" ? "updateProject" : "registerProject",
          userAction: mode === "edit" ? "updating a project" : "registering a project",
        }, error);
        conversion.trackFailure(
          error instanceof Error ? error.name || "Error" : "unknown",
        );
        trackProjectSubmit({
          success: false,
          mode,
          errorCode: error instanceof Error ? error.name || "Error" : "unknown",
        });
        experiment.trackError();
      } finally {
        setIsSubmitting(false);
      }
    },
    [customOnSubmit, mode, projectId, reset, router, run, draft, locale],
  );

  const onPreSubmit = useCallback(
    (data: ProjectFormValues) => {
      experiment.trackStart();
      const payload = {
        ...data,
        domain: extractDomain(data.websiteUrl),
      };

      const result = findDuplicates({
        id: mode === "edit" ? projectId : undefined,
        name: payload.name,
        websiteUrl: payload.websiteUrl,
        githubUrl: payload.githubUrl,
        contractAddresses: payload.contractAddresses,
        description: payload.description,
        primaryCategory: payload.primaryCategory,
      });

      if (result.hasExactDuplicate) {
        // Prevent exact duplicates
        setDuplicateWarning({
          isOpen: true,
          isExact: true,
          matches: result.candidates.map((c) => c.project),
          reasons: result.reasons,
          payload: null,
        });
        return;
      }

      if (result.hasPotentialDuplicates) {
        // Warn and suggest merges
        setDuplicateWarning({
          isOpen: true,
          isExact: false,
          matches: result.candidates.map((c) => c.project),
          reasons: result.reasons,
          payload,
        });
        return;
      }

      void executeSubmit(payload);
    },
    [executeSubmit, mode, projectId, experiment],
  );

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    conversion.trackSubmitAttempt();
    setCaptchaError(null);

    const token = await captcha.runCaptcha();
    const validation = captcha.validateOnSubmit(token);
    if (!validation.valid) {
      setCaptchaError(validation.message);
      conversion.trackFailure("captcha_failed");
      return;
    }

    void handleSubmit(onPreSubmit)();
  };

  const handleExportPdf = () => {
    downloadFormSubmissionPdf({
      ...watchedValues,
      mode,
      projectId,
      submittedAt: new Date().toISOString(),
    });
    toast.success("Opening PDF export — use Print / Save as PDF");
  };

  const handleSaveTemplate = (name: string, description: string) => {
    if (!publicKey) {
      return { success: false, error: "Connect a wallet to save templates" };
    }
    const result = formTemplateService.saveAsTemplate(publicKey, name, watchedValues, {
      description,
    });
    if (result.success) {
      toast.success("Template saved");
    }
    return result;
  };

  const handleApplyTemplate = (template: FormTemplate) => {
    reset({
      name: template.data.name || "",
      primaryCategory: template.data.primaryCategory || "",
      tags: template.data.tags || [],
      description: template.data.description || "",
      websiteUrl: template.data.websiteUrl || "",
      githubUrl: template.data.githubUrl || "",
      logoUrl: template.data.logoUrl || "",
      docsUrl: template.data.docsUrl || "",
      auditReportUrl: template.data.auditReportUrl || "",
      bugBountyUrl: template.data.bugBountyUrl || "",
      contractAddresses: template.data.contractAddresses?.length
        ? template.data.contractAddresses
        : [],
    });
    setShowTemplateLibrary(false);
  };

  const handleDiscardDraft = () => {
    setDiscardDialogOpen(true);
  };

  const confirmDiscardDraft = async () => {
    await draft.deleteDraft();
    setDraftRestored(false);
    reset({
      name: initialData?.name || "",
      primaryCategory: initialData?.primaryCategory || initialData?.category || "",
      tags: initialData?.tags || [],
      description: initialData?.description || "",
      websiteUrl: initialData?.websiteUrl || "",
      githubUrl: initialData?.githubUrl || "",
      logoUrl: initialData?.logoUrl || "",
      docsUrl: initialData?.docsUrl || "",
      contractAddresses: initialData?.contractAddresses || [],
    });
    setDiscardDialogOpen(false);
  };

  return (
    <ProjectFormContext.Provider
      value={{
        mode,
        projectId,
        isSubmitting,
        watchField: (name) => watch(name),
        formErrors: errors as Record<string, any>,
      }}
    >
    <ErrorBoundary
      operation={mode === "edit" ? "Project update form" : "Project registration form"}
      userAction={mode === "edit" ? "updating a project" : "registering a project"}
      onReset={() => reset()}
    >
    <Card
      variant="glass"
      padding="lg"
      className="w-full max-w-2xl mx-auto animate-fade-up"
    >
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3 bg-blue-500 rounded-2xl text-white">
          <Rocket className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "edit" ? "Edit Project" : "Register Project"}
            </h2>
            {experiment.variant.id === "variant_guided_steps" && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Guided Steps Variant
              </span>
            )}
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            {mode === "edit"
              ? "Update your project's information."
              : "Onboard your dApp to the Dongle ecosystem."}
          </p>
        </div>
      </div>

      <div className="relative">
      <form
        ref={bindFormRef}
        onSubmit={handleFormSubmit}
        onFocusCapture={() => conversion.trackStart()}
        className="space-y-6"
      >
        <FormHeatmapOverlay
          cells={heatmap.cells}
          problemAreas={heatmap.problemAreas}
          visible={showHeatmap}
        />
        {draftRestored && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Your previous draft has been restored</span>
          </div>
        )}

        <DraftIndicator
          hasDraft={draft.hasDraft}
          lastSaved={draft.lastSaved}
          isSaving={draft.isSaving}
          saveError={draft.saveError}
          onDiscard={handleDiscardDraft}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {mode === "edit" && initialData && (
            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-xs"
            >
              <GitCompare className="w-3.5 h-3.5" />
              {showComparison ? "Hide Changes" : "Compare Changes"}
            </button>
          )}

          <FormExportMenu
            getData={() => getValues()}
            filename={watchedValues.name || "project-form"}
            fields={EXPORT_FIELDS}
            labels={EXPORT_LABELS}
            className="justify-end ml-auto"
          />
        </div>

        {mode === "edit" && initialData && showComparison && (
          <FormValueComparison
            originalValues={defaultFormValues}
            currentValues={watchedValues}
            fieldLabels={EXPORT_LABELS}
            onResetField={(key, originalVal) => {
              setValue(key as any, originalVal, { shouldDirty: true, shouldValidate: true });
            }}
            onResetAll={(orig) => {
              Object.entries(orig).forEach(([k, v]) => {
                setValue(k as any, v, { shouldDirty: true, shouldValidate: true });
              });
            }}
          />
        )}

        {/* Quality Checklist */}
        <SubmissionChecklist
          formData={{
            name: watchedValues.name,
            primaryCategory: watchedValues.primaryCategory,
            websiteUrl: watchedValues.websiteUrl,
            githubUrl: watchedValues.githubUrl,
            logoUrl: watchedValues.logoUrl,
            docsUrl: watchedValues.docsUrl,
            auditReportUrl: watchedValues.auditReportUrl,
            bugBountyUrl: watchedValues.bugBountyUrl,
            description: watchedValues.description,
            contractAddresses: watchedValues.contractAddresses,
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Project Name"
            required={fieldRequirements.name.required}
            placeholder="e.g. Soroban Swap"
            maxLength={50}
            {...register("name")}
            error={errors.name?.message}
            helperText={t("projectForm.hints.name")}
          />
          <SelectField
            label="Category"
            required={fieldRequirements.primaryCategory.required}
            options={CATEGORY_FORM_OPTIONS}
            {...register("primaryCategory")}
            error={errors.primaryCategory?.message}
            helperText={t("projectForm.hints.category")}
          />
        </div>

        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput
              label="Tags"
              tags={field.value}
              onChange={field.onChange}
              error={errors.tags?.message}
              placeholder="Add tags (press enter)"
            />
          )}
        />

        <TextAreaField
          label="Description"
          required={fieldRequirements.description.required}
          placeholder="What does your project do? Keep it concise and engaging."
          maxLength={500}
          {...register("description")}
          error={errors.description?.message}
          helperText={t("projectForm.hints.description")}
        />

        <FormField
          label="Project Website"
          required={fieldRequirements.websiteUrl.required}
          placeholder="https://yourproject.com"
          {...register("websiteUrl")}
          error={errors.websiteUrl?.message}
          helperText={t("projectForm.hints.websiteUrl")}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label={fieldLabel("Repository URL", "githubUrl")}
            required={fieldRequirements.githubUrl.required}
            placeholder="https://github.com/owner/repo"
            {...register("githubUrl")}
            error={errors.githubUrl?.message}
            helperText={t("projectForm.hints.githubUrl")}
          />
          <FormField
            label={fieldLabel("Logo URL", "logoUrl")}
            required={fieldRequirements.logoUrl.required}
            placeholder="https://..."
            {...register("logoUrl")}
            error={errors.logoUrl?.message}
            helperText={t("projectForm.hints.logoUrl")}
          />
          <FormField
            label={fieldLabel("Documentation URL", "docsUrl")}
            required={fieldRequirements.docsUrl.required}
            placeholder="https://docs..."
            {...register("docsUrl")}
            error={errors.docsUrl?.message}
            helperText={t("projectForm.hints.docsUrl")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label={fieldLabel("Audit Report URL", "auditReportUrl")}
            required={fieldRequirements.auditReportUrl.required}
            placeholder="https://..."
            {...register("auditReportUrl")}
            error={errors.auditReportUrl?.message}
            helperText={t("projectForm.hints.auditReportUrl")}
          />
          <FormField
            label={fieldLabel("Bug Bounty URL", "bugBountyUrl")}
            required={fieldRequirements.bugBountyUrl.required}
            placeholder="https://..."
            {...register("bugBountyUrl")}
            error={errors.bugBountyUrl?.message}
            helperText={t("projectForm.hints.bugBountyUrl")}
          />
        </div>

        {/* Contract Addresses */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Contract Addresses{" "}
                <span className="font-normal text-zinc-400 dark:text-zinc-500">
                  (Optional)
                </span>
              </label>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400" role="note">
                {t("projectForm.hints.contractAddresses")}
              </p>
            </div>
          </div>

          <Controller
            name="contractAddresses"
            control={control}
            render={({ field }) => {
              const addresses: string[] = field.value ?? [];

              const handleAdd = () => {
                if (addresses.length < 5) {
                  field.onChange([...addresses, ""]);
                }
              };

              const handleChange = (index: number, value: string) => {
                const next = addresses.map((a, i) => (i === index ? value : a));
                field.onChange(next);
              };

              const handleRemove = (index: number) => {
                field.onChange(addresses.filter((_, i) => i !== index));
              };

              return (
                <div className="space-y-2">
                  {addresses.length === 0 ? (
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add a contract address
                    </button>
                  ) : (
                    <>
                      {addresses.map((addr, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={addr}
                              onChange={(e) => handleChange(index, e.target.value)}
                              placeholder="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
                              aria-label={`Contract address ${index + 1}`}
                              className="w-full font-mono text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 transition-colors"
                            />
                            {errors.contractAddresses?.[index]?.message && (
                              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                                {errors.contractAddresses[index].message}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            aria-label={`Remove contract address ${index + 1}`}
                            className="mt-1 p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {addresses.length < 5 && (
                        <button
                          type="button"
                          onClick={handleAdd}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add another address
                        </button>
                      )}
                    </>
                  )}

                  {errors.contractAddresses?.root?.message && (
                    <p className="text-sm text-red-500 dark:text-red-400">
                      {errors.contractAddresses.root.message}
                    </p>
                  )}
                </div>
              );
            }}
          />
        </div>

        <FormCaptcha
          mode={captcha.mode}
          challenge={captcha.challenge}
          accessibleAnswer={captcha.accessibleAnswer}
          onAnswerChange={captcha.setAccessibleAnswer}
          onUseAccessible={captcha.useAccessibleAlternative}
          onRequestChallenge={captcha.requestChallenge}
          loading={captcha.loading}
          error={captchaError}
        />

        <FormSessionRecordingControls
          consented={sessionRecording.consented}
          onEnable={sessionRecording.enableRecording}
          onDisable={sessionRecording.disableRecording}
          recordings={sessionRecording.recordings}
          playing={sessionRecording.playing}
          playbackFrame={sessionRecording.playbackFrame}
          onPlay={(rec) => sessionRecording.startPlayback(rec)}
          onStopPlayback={sessionRecording.stopPlayback}
        />

        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
          <button
            type="button"
            className="underline"
            onClick={() => {
              heatmap.captureSnapshot();
              setShowHeatmap((v) => !v);
            }}
          >
            {showHeatmap ? "Hide" : "Show"} interaction heatmap
          </button>
          <span>
            Scroll depth: {Math.round((heatmap.snapshot?.maxScrollDepth ?? 0) * 100)}%
          </span>
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting || isInProgress}
          className="w-full"
          size="lg"
          rightIcon={<CheckCircle2 className="w-5 h-5" />}
        >
          {isSubmitting || isInProgress
            ? "Processing Transaction..."
            : mode === "edit"
            ? "Update Project"
            : "Submit Registration"}
        </Button>

        {progress.phase !== "idle" && (
          <TransactionProgressPanel
            progress={progress}
            onRetry={() => {
              setIsSubmitting(true);
              setSubmissionRetryCount((prev) => prev + 1);
              void retry().finally(() => setIsSubmitting(false));
            }}
          />
        )}

        {(progress.phase === "failure" || (submissionError && progress.phase === "idle")) && (
          <FormSubmissionRetry
            error={submissionError || progress.errorMessage || progress.message}
            retryCount={submissionRetryCount}
            maxRetries={3}
            isRetrying={isSubmitting || isInProgress}
            onRetry={async () => {
              setSubmissionRetryCount((prev) => prev + 1);
              setIsSubmitting(true);
              setSubmissionError(null);
              if (progress.phase === "failure") {
                await retry().finally(() => setIsSubmitting(false));
              } else {
                await executeSubmit(getValues() as ProjectFormValues);
              }
            }}
            onDismiss={() => setSubmissionError(null)}
          />
        )}

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 px-8">
          {mode === "edit"
            ? "By updating, you agree to have your project details updated on the Stellar network."
            : "By submitting, you agree to have your project details stored on the Stellar network. A small transaction fee will be required for on-chain registration."}
        </p>
      </form>
      </div>

      <ConfirmDialog
        isOpen={duplicateWarning.isOpen}
        title={duplicateWarning.isExact ? "Exact Duplicate Detected" : "Possible Duplicate Detected"}
        description={
          duplicateWarning.isExact
            ? `An identical project already exists in the registry:\n\n${duplicateWarning.reasons.join(
                "\n",
              )}\n\nExact duplicate submissions are prevented to protect registry integrity. Please review the existing project or edit your details.`
            : `We found existing projects that look similar to yours:\n\n${duplicateWarning.reasons.join(
                "\n",
              )}\n\nWould you like to continue with your submission or review existing records?`
        }
        confirmLabel={duplicateWarning.isExact ? "Review Project" : "Continue Anyway"}
        cancelLabel={duplicateWarning.isExact ? "Close" : "Cancel"}
        variant={duplicateWarning.isExact ? "danger" : "warning"}
        onConfirm={() => {
          if (duplicateWarning.isExact) {
            const firstMatch = duplicateWarning.matches[0];
            setDuplicateWarning({ isOpen: false, isExact: false, matches: [], reasons: [], payload: null });
            if (firstMatch) {
              router.push(`/projects/${firstMatch.id}`);
            }
            return;
          }
          const payload = duplicateWarning.payload;
          setDuplicateWarning({ isOpen: false, isExact: false, matches: [], reasons: [], payload: null });
          if (payload) {
            void executeSubmit(payload);
          }
        }}
        onCancel={() => {
          setDuplicateWarning({ isOpen: false, isExact: false, matches: [], reasons: [], payload: null });
        }}
      />

      <ConfirmDialog
        isOpen={discardDialogOpen}
        title="Discard Draft"
        description="Are you sure you want to discard this draft? All unsaved changes will be lost."
        confirmLabel="Discard Draft"
        cancelLabel="Keep Draft"
        variant="danger"
        onConfirm={() => void confirmDiscardDraft()}
        onCancel={() => setDiscardDialogOpen(false)}
      />

      <SaveTemplateModal
        isOpen={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        onSave={handleSaveTemplate}
      />
    </Card>
    </ErrorBoundary>
    </ProjectFormContext.Provider>
  );
}
