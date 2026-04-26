"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FormField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { sorobanService } from "@/services/stellar/soroban.service";
import { toast } from "sonner";
import { Rocket, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  category: z.string().min(1, "Please select a category"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500),
  url: z.string().url("Please enter a valid URL"),
  logoUrl: z
    .string()
    .url("Please enter a valid image URL")
    .or(z.string().length(0)),
  docsUrl: z
    .string()
    .url("Please enter a valid documentation URL")
    .or(z.string().length(0)),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const categories = [
  { value: "defi", label: "DeFi / DEX" },
  { value: "nfts", label: "NFTs / Collectibles" },
  { value: "gaming", label: "Gaming" },
  { value: "tools", label: "Tools / Infrastructure" },
  { value: "dao", label: "DAOs / Governance" },
  { value: "social", label: "Social / Community" },
];

export default function ProjectForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      url: "",
      logoUrl: "",
      docsUrl: "",
    },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    setIsSubmitting(true);
    const promise = sorobanService.registerProject(data);

    toast.promise(promise, {
      loading: "Registering your project on-chain...",
      success: (res) => {
        setIsSubmitting(false);
        reset();
        setTimeout(() => router.push("/"), 2000);
        return `Project registered successfully! Tx: ${res.hash.substring(0, 8)}...`;
      },
      error: (err) => {
        setIsSubmitting(false);
        return `Registration failed: ${err.message}`;
      },
    });
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
            Register Project
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Onboard your dApp to the Dongle ecosystem.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Project Name"
            placeholder="e.g. Soroban Swap"
            {...register("name")}
            error={errors.name?.message}
          />
          <SelectField
            label="Category"
            options={categories}
            {...register("category")}
            error={errors.category?.message}
          />
        </div>

        <TextAreaField
          label="Description"
          placeholder="What does your project do? Keep it concise and engaging."
          {...register("description")}
          error={errors.description?.message}
        />

        <FormField
          label="Project Website"
          placeholder="https://yourproject.com"
          {...register("url")}
          error={errors.url?.message}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full"
          size="lg"
          rightIcon={<CheckCircle2 className="w-5 h-5" />}
        >
          {isSubmitting ? "Processing Transaction..." : "Submit Registration"}
        </Button>

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 px-8">
          By submitting, you agree to have your project details stored on the
          Stellar network. A small transaction fee will be required for on-chain
          registration.
        </p>
      </form>
    </Card>
  );
}
