"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TagInput } from "@/components/ui/TagInput";
import { sorobanService } from "@/services/stellar/soroban.service";
import { projectService } from "@/services/project/project.service";
import { projectSubmissionService } from "@/services/project/project-submission.service";
import { walletService } from "@/services/wallet/wallet.service";
import { generateProjectIdFromName } from "@/lib/project-id";
import { computeQualityScore, detectSuspiciousFlags } from "@/lib/submission-quality";
import { Rocket, CheckCircle2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import TransactionProgressPanel from "@/components/transactions/TransactionProgressPanel";
import { useOnChainTransaction } from "@/hooks/useOnChainTransaction";
import { useDraft } from "@/hooks/useDraft";
import { DraftIndicator } from "@/components/projects/DraftIndicator";
import { SubmissionChecklist } from "@/components/projects/SubmissionChecklist";
import { useWallet } from "@/context/wallet.context";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { normalizeUrl, extractDomain } from "@/lib/url";
import { validateRepositoryUrl, normalizeRepositoryUrl } from "@/lib/repository";
import {
  CATEGORY_DISPLAY_TO_FORM,
  CATEGORY_FORM_OPTIONS,
  CATEGORY_FORM_MAP,
} from "@/types/project";
import type { Project } from "@/types/project";
import { trackProjectSubmit } from "@/lib/analytics";
import { isValidSorobanContractId } from "@/lib/stellar-address";
import { isBlank } from "@/lib/string";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { logger } from "@/lib/logger";
import { ProjectFormContext } from "@/context/project-form.context";

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

const projectSchema = z.object({
  name: z.string().trim().min(3, "Project name must be at least 3 characters"),
  primaryCategory: z.string().trim().toLowerCase().min(1, "Please select a category"),
  tags: z.array(z.string()).transform((tags) =>
    [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
  ),
  description: z
    .string()
    .trim()
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
    .max(5, "You can add at most 5 contract addresses")
    .transform((addresses) => [...new Set(addresses.filter(Boolean))]),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

const formSections = [
  {
    title: "Project basics",
    description: "Tell the community what your project is.",
    fields: ["name", "primaryCategory", "tags", "description"] as const,
  },
  {
    title: "Online presence",
    description: "Add links so people can learn more.",
    fields: ["websiteUrl", "githubUrl", "logoUrl", "docsUrl", "auditReportUrl", "bugBountyUrl"] as const,
  },
  {
    title: "Smart contracts",
    description: "Connect the contracts associated with your project.",
    fields: ["contractAddresses"] as const,
  },
] as const;

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
    matches: Project[];
    reasons: string[];
    payload: ProjectFormValues & { domain?: string } | null;
  }>({ isOpen: false, matches: [], reasons: [], payload: null });
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState(0);

  const router = useRouter();
  const { progress, run, retry, isInProgress } = useOnChainTransaction();
  const { publicKey } = useWallet();

  // Draft management – passes wallet address so drafts sync to the server
  const draft = useDraft({
    mode,
    projectId,
    autoSave: true,
    walletAddress: publicKey,
  });
  const [draftRestored, setDraftRestored] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    trigger,
    watch,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
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
    },
  });

  const nameField = register("name");
  const matchingProjects = projectSearchQuery.trim().length >= 2
    ? projectService.getAllProjects().filter((project) => {
        const query = projectSearchQuery.trim().toLowerCase();
        return [project.name, project.websiteUrl, project.githubUrl]
          .some((value) => value?.toLowerCase().includes(query));
      }).slice(0, 5)
    : [];

  const selectExistingProject = (project: Project) => {
    reset({
      name: project.name,
      primaryCategory: CATEGORY_DISPLAY_TO_FORM[project.primaryCategory] ?? "",
      tags: project.tags ?? [],
      description: project.description ?? "",
      websiteUrl: project.websiteUrl ?? "",
      githubUrl: project.githubUrl ?? "",
      logoUrl: project.logoUrl ?? "",
      docsUrl: project.docsUrl ?? "",
      auditReportUrl: project.auditReportUrl ?? "",
      bugBountyUrl: project.bugBountyUrl ?? "",
      contractAddresses: project.contractAddresses?.slice(0, 5) ?? [],
    });
    setProjectSearchQuery("");
  };



  // Show notification when draft is restored
  useEffect(() => {
    if (draft.loadedDraft) {
      setDraftRestored(true);
      reset(draft.loadedDraft);
    }
  }, [draft.loadedDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  useUnsavedChanges(isDirty, isSubmitting);

  // Watch form values for checklist and auto-save.
  // react-hook-form's watch() is intentionally used here for live value access.
  // The React Compiler flags it as non-memoizable, but this component does not
  // rely on memoization of watchedValues — it's read-only for the checklist
  // and the draft autosave effect below.
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedValues = watch();

  // Auto-save draft when form changes — derive from watchedValues instead of
  // a watch() subscription to avoid the react-hooks/incompatible-library warning
  // that fires when RHF's watch callback is passed into a memoized hook.
  useEffect(() => {
    draft.saveDraft(watchedValues as ProjectFormValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues)]);

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
          if (mode !== "edit") {
            try {
              let submittedBy = "unknown";
              try {
                submittedBy = await walletService.getPublicKey();
              } catch {
                // wallet may disconnect after tx
              }

              const qualityScore = computeQualityScore(cleanedPayload);
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
          // Clear draft after successful submission
          draft.clearDraft();
          reset();
          const redirectPath =
            mode === "edit" && projectId ? `/projects/${projectId}` : "/";
          setTimeout(() => router.push(redirectPath), 1500);
        } else {
          trackProjectSubmit({
            success: false,
            mode,
            errorCode: "transaction_incomplete",
          });
        }
      } catch (error) {
        logger.error("Soroban project operation failed", {
          operation: mode === "edit" ? "updateProject" : "registerProject",
          userAction: mode === "edit" ? "updating a project" : "registering a project",
        }, error);
        trackProjectSubmit({
          success: false,
          mode,
          errorCode: error instanceof Error ? error.name || "Error" : "unknown",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [customOnSubmit, mode, projectId, reset, router, run, draft],
  );

  const onPreSubmit = useCallback(
    (data: ProjectFormValues) => {
      const payload = {
        ...data,
        domain: extractDomain(data.websiteUrl),
      };

      const result = projectService.detectDuplicates({
        name: payload.name,
        websiteUrl: payload.websiteUrl,
        githubUrl: payload.githubUrl,
        excludeProjectId: mode === "edit" ? projectId : undefined,
      });

      if (result.hasDuplicates) {
        setDuplicateWarning({ isOpen: true, matches: result.matches, payload, reasons: result.reasons });
        return;
      }

      void executeSubmit(payload);
    },
    [executeSubmit, mode, projectId],
  );

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(onPreSubmit)(event);
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

  const goToSection = async (sectionIndex: number) => {
    if (sectionIndex <= activeSection) {
      setActiveSection(sectionIndex);
      return;
    }

    for (let index = activeSection; index < sectionIndex; index += 1) {
      const isValid = await trigger([...formSections[index].fields]);
      if (!isValid) {
        setActiveSection(index);
        return;
      }
    }

    setActiveSection(sectionIndex);
  };

  const goToNextSection = () => {
    void goToSection(Math.min(activeSection + 1, formSections.length - 1));
  };

  const goToPreviousSection = () => {
    setActiveSection((section) => Math.max(section - 1, 0));
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
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === "edit" ? "Edit Project" : "Register Project"}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            {mode === "edit"
              ? "Update your project's information."
              : "Onboard your dApp to the Dongle ecosystem."}
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
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
          }}
        />

        <nav aria-label="Project form progress" className="mb-8">
          <ol className="grid grid-cols-3 gap-2 sm:gap-4">
            {formSections.map((section, index) => {
              const isCurrent = activeSection === index;
              const isComplete = index < activeSection;

              return (
                <li key={section.title}>
                  <button
                    type="button"
                    onClick={() => void goToSection(index)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`w-full border-t-2 pt-3 text-left transition-colors ${
                      isCurrent
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : isComplete
                        ? "border-green-500 text-green-600 dark:text-green-400"
                        : "border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
                    }`}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wide">
                      Step {index + 1}
                    </span>
                    <span className="mt-1 block text-sm font-medium sm:text-base">
                      {section.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            {formSections[activeSection].description}
          </p>
        </nav>

        {activeSection === 0 && <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <FormField
              label="Project Name"
              placeholder="Search existing projects or enter a name"
              maxLength={50}
              {...nameField}
              onChange={(event) => {
                nameField.onChange(event);
                setProjectSearchQuery(event.target.value);
              }}
              error={errors.name?.message}
            />
            {mode === "create" && matchingProjects.length > 0 && (
              <ul
                aria-label="Matching existing projects"
                className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
              >
                {matchingProjects.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      aria-label={`Use existing project ${project.name}`}
                      onClick={() => selectExistingProject(project)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
                    >
                      <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {project.name}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {project.primaryCategory}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <SelectField
            label="Category"
            options={CATEGORY_FORM_OPTIONS}
            {...register("primaryCategory")}
            error={errors.primaryCategory?.message}
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
          placeholder="What does your project do? Keep it concise and engaging."
          maxLength={500}
          {...register("description")}
          error={errors.description?.message}
        />
        </>}

        {activeSection === 1 && <>
        <FormField
          label="Project Website"
          placeholder="https://yourproject.com"
          {...register("websiteUrl")}
          error={errors.websiteUrl?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="Repository URL (Optional)"
            placeholder="https://github.com/owner/repo"
            {...register("githubUrl")}
            error={errors.githubUrl?.message}
            helperText="Supported: GitHub, GitLab, Bitbucket"
          />
          <FormField
            label="Logo URL (Optional)"
            placeholder="https://..."
            {...register("logoUrl")}
            error={errors.logoUrl?.message}
          />
          <FormField
            label="Documentation URL (Optional)"
            placeholder="https://docs..."
            {...register("docsUrl")}
            error={errors.docsUrl?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Audit Report URL (Optional)"
            placeholder="https://..."
            {...register("auditReportUrl")}
            error={errors.auditReportUrl?.message}
          />
          <FormField
            label="Bug Bounty URL (Optional)"
            placeholder="https://..."
            {...register("bugBountyUrl")}
            error={errors.bugBountyUrl?.message}
          />
        </div>
        </>}

        {activeSection === 2 && <>
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
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Soroban contract IDs associated with this project — 56 characters
                starting with&nbsp;'C'.
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
        </>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={goToPreviousSection}
            disabled={activeSection === 0 || isSubmitting || isInProgress}
            className="sm:w-auto"
          >
            Previous
          </Button>
          {activeSection < formSections.length - 1 ? (
            <Button type="button" onClick={goToNextSection} className="sm:ml-auto">
              Continue
            </Button>
          ) : (
            <Button
              type="submit"
              isLoading={isSubmitting || isInProgress}
              className="sm:ml-auto"
              size="lg"
              rightIcon={<CheckCircle2 className="w-5 h-5" />}
            >
              {isSubmitting || isInProgress
                ? "Processing Transaction..."
                : mode === "edit"
                ? "Update Project"
                : "Submit Registration"}
            </Button>
          )}
        </div>

        {progress.phase !== "idle" && (
          <TransactionProgressPanel
            progress={progress}
            onRetry={() => {
              setIsSubmitting(true);
              void retry().finally(() => setIsSubmitting(false));
            }}
          />
        )}

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 px-8">
          {mode === "edit"
            ? "By updating, you agree to have your project details updated on the Stellar network."
            : "By submitting, you agree to have your project details stored on the Stellar network. A small transaction fee will be required for on-chain registration."}
        </p>
      </form>

      <ConfirmDialog
        isOpen={duplicateWarning.isOpen}
        title="Possible Duplicate Detected"
        description={`We found existing projects that look very similar to yours:\n\n${duplicateWarning.reasons.join("\n")}\n\nAre you sure you want to continue with this submission?`}
        confirmLabel="Continue Anyway"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          const payload = duplicateWarning.payload;
          setDuplicateWarning({ isOpen: false, matches: [], reasons: [], payload: null });
          if (payload) {
            void executeSubmit(payload);
          }
        }}
        onCancel={() => {
          setDuplicateWarning({ isOpen: false, matches: [], reasons: [], payload: null });
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
    </Card>
    </ErrorBoundary>
    </ProjectFormContext.Provider>
  );
}
