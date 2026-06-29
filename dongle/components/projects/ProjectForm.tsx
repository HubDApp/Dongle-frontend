"use client";

import React, { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TagInput } from "@/components/ui/TagInput";
import { sorobanService } from "@/services/stellar/soroban.service";
import { projectService } from "@/services/project/project.service";
import { Rocket, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import TransactionProgressPanel from "@/components/transactions/TransactionProgressPanel";
import { useOnChainTransaction } from "@/hooks/useOnChainTransaction";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { normalizeUrl, extractDomain } from "@/lib/url";
import { CATEGORY_FORM_OPTIONS } from "@/types/project";
import type { Project } from "@/types/project";

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
  if (val.trim().length === 0) return "";
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

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  primaryCategory: z.string().min(1, "Please select a category"),
  tags: z.array(z.string()),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description cannot exceed 500 characters"),
  websiteUrl: urlSchema,
  githubUrl: optionalUrlSchema,
  logoUrl: optionalUrlSchema,
  docsUrl: optionalUrlSchema,
  auditReportUrl: optionalUrlSchema,
  bugBountyUrl: optionalUrlSchema,
});

type ProjectFormValues = z.infer<typeof projectSchema>;

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
    payload: ProjectFormValues & { domain?: string } | null;
  }>({ isOpen: false, matches: [], payload: null });

  const router = useRouter();
  const { progress, run, retry, isInProgress } = useOnChainTransaction();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
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
    },
  });

  useUnsavedChanges(isDirty, isSubmitting);

  const executeSubmit = useCallback(
    async (payload: ProjectFormValues & { domain?: string }) => {
      if (customOnSubmit) {
        return customOnSubmit(payload);
      }

      setIsSubmitting(true);
      try {
        const result = await run((onPhaseChange) => {
          // Pass primaryCategory as category to the Soroban service to maintain contract compatibility
          const contractPayload = {
            ...payload,
            category: payload.primaryCategory,
          };
          if (mode === "edit" && projectId) {
            return sorobanService.updateProject(projectId, contractPayload, { onPhaseChange });
          }
          return sorobanService.registerProject(contractPayload, { onPhaseChange });
        });

        if (result) {
          reset();
          const redirectPath =
            mode === "edit" && projectId ? `/projects/${projectId}` : "/";
          setTimeout(() => router.push(redirectPath), 1500);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [customOnSubmit, mode, projectId, reset, router, run],
  );

  const onPreSubmit = useCallback(
    (data: ProjectFormValues) => {
      const payload = {
        ...data,
        domain: extractDomain(data.websiteUrl),
      };

      const existingProjects = projectService.getAllProjects();
      const normName = (str: string) => str.toLowerCase().trim();
      const normUrl = (str: string) =>
        str.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

      const duplicates = existingProjects.filter((existing) => {
        if (mode === "edit" && existing.id === projectId) return false;

        if (normName(existing.name) === normName(payload.name)) return true;
        if (
          existing.domain &&
          payload.domain &&
          normUrl(existing.domain) === normUrl(payload.domain)
        )
          return true;
        if (
          existing.githubUrl &&
          payload.githubUrl &&
          normUrl(existing.githubUrl) === normUrl(payload.githubUrl)
        )
          return true;

        return false;
      });

      if (duplicates.length > 0) {
        setDuplicateWarning({ isOpen: true, matches: duplicates, payload });
        return;
      }

      void executeSubmit(payload);
    },
    [executeSubmit, mode, projectId],
  );

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(onPreSubmit)(event);
  };

  return (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Project Name"
            placeholder="e.g. Soroban Swap"
            maxLength={50}
            {...register("name")}
            error={errors.name?.message}
          />
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

        <FormField
          label="Project Website"
          placeholder="https://yourproject.com"
          {...register("websiteUrl")}
          error={errors.websiteUrl?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="GitHub URL (Optional)"
            placeholder="https://github.com/..."
            {...register("githubUrl")}
            error={errors.githubUrl?.message}
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
        description={`We found existing projects that look very similar to yours:\n\n${duplicateWarning.matches
          .map((m) => `- ${m.name}`)
          .join("\n")}\n\nAre you sure you want to continue with this submission?`}
        confirmLabel="Continue Anyway"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          setDuplicateWarning({ isOpen: false, matches: [], payload: null });
          if (duplicateWarning.payload) {
            void executeSubmit(duplicateWarning.payload);
          }
        }}
        onCancel={() => {
          setDuplicateWarning({ isOpen: false, matches: [], payload: null });
        }}
      />
    </Card>
  );
}
