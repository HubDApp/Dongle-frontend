"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ShieldCheck } from "lucide-react";
import { sorobanService } from "@/services/stellar/soroban.service";
import { toast } from "sonner";
import { trackVerificationRequest } from "@/lib/analytics";
import { useFormAnalytics } from "@/hooks/useFormAnalytics";

const verificationSchema = z.object({
  projectId: z
    .string()
    .min(3, "Project ID or Domain must be at least 3 characters"),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

interface VerificationFormProps {
  onSuccess?: (projectId: string) => void;
}

export default function VerificationForm({ onSuccess }: VerificationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      projectId: "",
    },
  });

  // Issue #521, #522, #523: form analytics
  const analytics = useFormAnalytics({
    formId: "verification-request",
    fieldCount: 1,
    isDirty,
  });

  const projectIdHandlers = analytics.fieldHandlers("projectId");

  const onSubmit = async (data: VerificationFormValues) => {
    setIsSubmitting(true);
    // Track submission attempt (issue #521)
    const hasErrors = Object.keys(errors).length > 0;
    analytics.wrapSubmit(
      async () => {
        const promise = sorobanService.requestVerification(data.projectId, data.projectId);
        toast.promise(promise, {
          loading: "Submitting verification request...",
          success: () => {
            setIsSubmitting(false);
            reset();
            trackVerificationRequest({
              success: true,
              projectRefLength: data.projectId.length,
            });
            if (onSuccess) onSuccess(data.projectId);
            return `Verification requested successfully!`;
          },
          error: (err) => {
            setIsSubmitting(false);
            trackVerificationRequest({
              success: false,
              errorCode: err instanceof Error ? err.name || "Error" : "unknown",
            });
            return `Request failed: ${err.message}`;
          },
        });
      },
      { hasErrors }
    )(data).catch(() => {
      setIsSubmitting(false);
    });
  };

  return (
    <Card
      variant="glass"
      padding="lg"
      className="w-full max-w-lg mx-auto animate-fade-up"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-green-500 rounded-2xl text-white">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Request Verification
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Submit your project for community review.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          label="Project ID or Domain"
          placeholder="e.g. yourproject.com"
          {...register("projectId")}
          onFocus={projectIdHandlers.onFocus}
          onChange={(e) => {
            projectIdHandlers.onChange(e);
            register("projectId").onChange(e);
          }}
          onBlur={(e) => {
            projectIdHandlers.onBlur(e);
            register("projectId").onBlur(e);
            // Track field-level validation on blur (issue #522)
            analytics.recordFieldValidation(
              "projectId",
              !errors.projectId,
              errors.projectId?.message
            );
          }}
          error={errors.projectId?.message}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </Card>
  );
}
