"use client";

import React, { useMemo } from "react";
import { CheckCircle2, Circle, AlertCircle, Info, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  FIELD_LABELS,
  getFieldRequirements,
  type ProjectFormRequirementField,
} from "@/utils/form-requirements.util";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  completed: boolean;
}

interface SubmissionChecklistProps {
  formData: {
    name?: string;
    primaryCategory?: string;
    websiteUrl?: string;
    githubUrl?: string;
    logoUrl?: string;
    docsUrl?: string;
    auditReportUrl?: string;
    bugBountyUrl?: string;
    description?: string;
    contractAddresses?: string[];
  };
  className?: string;
}

const CHECKLIST_META: Record<
  Exclude<ProjectFormRequirementField, "contractAddresses">,
  { description: string; completed: (formData: SubmissionChecklistProps["formData"]) => boolean }
> = {
  name: {
    description: "Clear, unique name (minimum 3 characters)",
    completed: (d) => (d.name?.trim().length ?? 0) >= 3,
  },
  primaryCategory: {
    description: "The category that best fits your project",
    completed: (d) => (d.primaryCategory?.trim().length ?? 0) > 0,
  },
  websiteUrl: {
    description: "Active website with project information",
    completed: (d) => !!d.websiteUrl && d.websiteUrl.trim().length > 0,
  },
  description: {
    description: "Clear explanation of what your project does (10-500 characters)",
    completed: (d) => (d.description?.trim().length ?? 0) >= 10,
  },
  logoUrl: {
    description: "High-quality project logo for better visibility",
    completed: (d) => !!d.logoUrl && d.logoUrl.trim().length > 0,
  },
  docsUrl: {
    description: "Developer or user documentation to help users understand your project",
    completed: (d) => !!d.docsUrl && d.docsUrl.trim().length > 0,
  },
  githubUrl: {
    description: "Link to GitHub, GitLab, or Bitbucket repository for transparency",
    completed: (d) => !!d.githubUrl && d.githubUrl.trim().length > 0,
  },
  auditReportUrl: {
    description: "Security audit report to build trust with users",
    completed: (d) => !!d.auditReportUrl && d.auditReportUrl.trim().length > 0,
  },
  bugBountyUrl: {
    description: "Active bug bounty program showing commitment to security",
    completed: (d) => !!d.bugBountyUrl && d.bugBountyUrl.trim().length > 0,
  },
};

const CHECKLIST_ORDER: Array<Exclude<ProjectFormRequirementField, "contractAddresses">> = [
  "name",
  "primaryCategory",
  "websiteUrl",
  "description",
  "logoUrl",
  "docsUrl",
  "githubUrl",
  "auditReportUrl",
  "bugBountyUrl",
];

export function SubmissionChecklist({ formData, className }: SubmissionChecklistProps) {
  const requirements = useMemo(
    () =>
      getFieldRequirements({
        primaryCategory: formData.primaryCategory,
        contractAddresses: formData.contractAddresses,
        auditReportUrl: formData.auditReportUrl,
      }),
    [formData.primaryCategory, formData.contractAddresses, formData.auditReportUrl],
  );

  const checklist = useMemo<ChecklistItem[]>(() => {
    return CHECKLIST_ORDER.map((field) => {
      const meta = CHECKLIST_META[field];
      const rule = requirements[field];
      return {
        id: field,
        label: FIELD_LABELS[field],
        description: rule.reason
          ? `${meta.description} (${rule.reason})`
          : meta.description,
        required: rule.required,
        completed: meta.completed(formData),
      };
    });
  }, [formData, requirements]);

  const stats = useMemo(() => {
    const required = checklist.filter((item) => item.required);
    const optional = checklist.filter((item) => !item.required);
    const requiredCompleted = required.filter((item) => item.completed).length;
    const optionalCompleted = optional.filter((item) => item.completed).length;

    return {
      requiredTotal: required.length,
      requiredCompleted,
      optionalTotal: optional.length,
      optionalCompleted,
      totalCompleted: requiredCompleted + optionalCompleted,
      total: checklist.length,
    };
  }, [checklist]);

  const qualityScore = useMemo(() => {
    const requiredWeight = 0.6;
    const optionalWeight = 0.4;

    const requiredScore =
      stats.requiredTotal > 0 ? stats.requiredCompleted / stats.requiredTotal : 1;
    const optionalScore =
      stats.optionalTotal > 0 ? stats.optionalCompleted / stats.optionalTotal : 0;

    return Math.round((requiredScore * requiredWeight + optionalScore * optionalWeight) * 100);
  }, [stats]);

  const getQualityMessage = (score: number) => {
    if (score === 100) return { text: "Perfect! All checklist items completed", color: "text-green-600 dark:text-green-400" };
    if (score >= 80) return { text: "Excellent quality listing", color: "text-green-600 dark:text-green-400" };
    if (score >= 60) return { text: "Good quality, consider adding optional items", color: "text-blue-600 dark:text-blue-400" };
    if (score >= 40) return { text: "Basic listing, add more details for better visibility", color: "text-yellow-600 dark:text-yellow-400" };
    return { text: "Complete required fields to submit", color: "text-orange-600 dark:text-orange-400" };
  };

  const qualityMessage = getQualityMessage(qualityScore);
  const canSubmit = stats.requiredCompleted === stats.requiredTotal;

  return (
    <Card className={className} padding="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Info className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Submission Quality Checklist</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Required fields update based on your category and other answers. Optional items improve visibility and trust.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Quality Score
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {qualityScore}%
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                qualityScore >= 80
                  ? "bg-green-500"
                  : qualityScore >= 60
                  ? "bg-blue-500"
                  : qualityScore >= 40
                  ? "bg-yellow-500"
                  : "bg-orange-500"
              }`}
              style={{ width: `${qualityScore}%` }}
            />
          </div>
          <p className={`text-xs mt-2 font-medium ${qualityMessage.color}`}>
            {qualityMessage.text}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Required</div>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {stats.requiredCompleted}/{stats.requiredTotal}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
            <div className="text-xs text-green-600 dark:text-green-400 mb-1">Optional</div>
            <div className="text-lg font-bold text-green-900 dark:text-green-100">
              {stats.optionalCompleted}/{stats.optionalTotal}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                item.completed
                  ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                  : item.required
                  ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900"
                  : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="pt-0.5">
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : item.required ? (
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      item.completed
                        ? "text-green-900 dark:text-green-100"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.required && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 font-medium">
                      Required
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs mt-0.5 ${
                    item.completed
                      ? "text-green-700 dark:text-green-300"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Prepare for verification
              </span>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                Verification isn&apos;t part of this form, but a strong listing
                is easier to verify. Before you request it, have your{" "}
                <strong>on-chain contract IDs</strong> ready to reference (in
                your docs or description), along with any audit reports or
                other evidence.
              </p>
              <Link
                href="/verify"
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300 hover:underline mt-2"
              >
                Request verification after listing
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {!canSubmit && (
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              <AlertCircle className="w-4 h-4 inline mr-1.5" />
              Complete all required fields to enable submission
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
