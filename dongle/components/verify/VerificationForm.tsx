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
    const promise = sorobanService.requestVerification(data.projectId);

    toast.promise(promise, {
      loading: "Submitting verification request...",
      success: () => {
        setIsSubmitting(false);
        reset();
        if (onSuccess) onSuccess(data.projectId);
        return `Verification requested successfully!`;
      },
      error: (err) => {
        setIsSubmitting(false);
        return `Request failed: ${err.message}`;
      },
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
          error={errors.projectId?.message}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </Card>
  );
}
