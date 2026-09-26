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
import {
  trackFormSubmit,
  trackFormSubmitSuccess,
  trackFormSubmitError,
  trackFormFieldChange,
  trackFormAbandon,
} from "@/lib/analytics";
import { GDPRConsent } from "@/components/gdpr/GDPRConsent";
import { gdprService } from "@/services/gdpr/gdpr.service";
import { trackConsentGiven } from "@/lib/analytics";
import Link from "next/link";

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
    formState: { errors },
    reset,
  } = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      projectId: "",
    },
  });

  const onSubmit = async (data: VerificationFormValues) => {
    setIsSubmitting(true);
    trackFormSubmit({ formType: "verification", fieldCount: 1 });

    // Track GDPR consent on submit
    const consentRecord = gdprService.getConsentStatus("verification", "verification-form", "anonymous");
    if (consentRecord && consentRecord.consentGiven) {
      trackConsentGiven({
        formType: "verification",
        formId: "verification-form",
        userId: "anonymous",
        purposes: consentRecord.purposes,
      });
    }

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
        trackFormSubmitSuccess({ formType: "verification", fieldCount: 1 });
        if (onSuccess) onSuccess(data.projectId);
        return `Verification requested successfully!`;
      },
      error: (err) => {
        setIsSubmitting(false);
        trackVerificationRequest({
          success: false,
          errorCode: err instanceof Error ? err.name || "Error" : "unknown",
        });
        trackFormSubmitError({ formType: "verification", fieldCount: 1, errorCode: err instanceof Error ? err.name || "Error" : "unknown" });
        return `Request failed: ${err.message}`;
      },
    });
  };

  // Track field changes for completion-rate analytics.
  const [touchedCount, setTouchedCount] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setTouchedCount((prev) => {
        const next = prev + 1;
        trackFormFieldChange({
          formType: "verification",
          fieldName: "projectId",
          fieldIndex: next,
          totalFields: 1,
        });
        return next;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Track form abandonment on unmount.
  useEffect(() => {
    return () => {
      if (!isSubmitting) {
        trackFormAbandon({
          formType: "verification",
          fieldCount: 1,
          touchedFields: touchedCount,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          error={errors.projectId?.message}
        />

        <GDPRConsent
          formType="verification"
          formId="verification-form"
          userId="anonymous"
          purposes={["form_submission", "data_processing"]}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </form>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-4">
        <Link href="/privacy-policy" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
          Privacy Policy
        </Link>
      </p>
    </Card>
  );
}
