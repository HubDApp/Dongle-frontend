"use client";

import React, { useMemo } from "react";
import { CheckCircle2, Circle, AlertCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";

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
    websiteUrl?: string;
    githubUrl?: string;
    logoUrl?: string;
    docsUrl?: string;
    auditReportUrl?: string;
    bugBountyUrl?: string;
    description?: string;
  };
  className?: string;
}

export function SubmissionChecklist({ formData, className }: SubmissionChecklistProps) {
  const checklist = useMemo<ChecklistItem[]>(() => {
    const items: ChecklistItem[] = [
      {
        id: "name",
        label: "Project Name",
        description: "Clear, unique name (minimum 3 characters)",
        required: true,
        completed: (formData.name?.trim().length ?? 0) >= 3,
      },
      {
        id: "website",
        label: "Project Website",
        description: "Active website with project information",
        required: true,
        completed: !!formData.websiteUrl && formData.websiteUrl.trim().length > 0,
      },
      {
        id: "description",
        label: "Description",
        description: "Clear explanation of what your project does (10-500 characters)",
        required: true,
        completed: (formData.description?.trim().length ?? 0) >= 10,
      },
      {
        id: "logo",
        label: "Logo URL",
        description: "High-quality project logo for better visibility",
        required: false,
        completed: !!formData.logoUrl && formData.logoUrl.trim().length > 0,
      },
      {
        id: "docs",
        label: "Documentation",
        description: "Developer or user documentation to help users understand your project",
        required: false,
        completed: !!formData.docsUrl && formData.docsUrl.trim().length > 0,
      },
      {
        id: "repository",
        label: "Repository URL",
        description: "Link to GitHub, GitLab, or Bitbucket repository for transparency",
        required: false,
        completed: !!formData.githubUrl && formData.githubUrl.trim().length > 0,
      },
      {
        id: "audit",
        label: "Audit Report",
        description: "Security audit report to build trust with users",
        required: false,
        completed: !!formData.auditReportUrl && formData.auditReportUrl.trim().length > 0,
      },
      {
        id: "bugBounty",
        label: "Bug Bounty Program",
        description: "Active bug bounty program showing commitment to security",
        required: false,
        completed: !!formData.bugBountyUrl && formData.bugBountyUrl.trim().length > 0,
      },
    ];

    return items;
  }, [formData]);

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
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Info className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Submission Quality Checklist</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Complete all required fields to submit. Optional items improve visibility and trust.
            </p>
          </div>
        </div>

        {/* Quality Score */}
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

        {/* Status Summary */}
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

        {/* Checklist Items */}
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

        {/* Submission Status */}
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
