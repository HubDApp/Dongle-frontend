"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import {
  CheckCircle,
  Clock,
  FileSearch,
  Eye,
  XCircle,
  ChevronRight,
} from "lucide-react";

/**
 * VerificationProgress — shows real-time verification status with
 * progress steps and estimated completion time (#691).
 */

export type VerificationStep =
  | "submitted"
  | "under_review"
  | "evidence_requested"
  | "final_review"
  | "approved"
  | "rejected";

interface StepConfig {
  label: string;
  icon: React.ElementType;
  description: string;
  estimatedDays: number;
}

const stepConfig: Record<VerificationStep, StepConfig> = {
  submitted: {
    label: "Submitted",
    icon: CheckCircle,
    description: "Verification request has been submitted",
    estimatedDays: 0,
  },
  under_review: {
    label: "Under Review",
    icon: Clock,
    description: "Initial review by the verification team",
    estimatedDays: 2,
  },
  evidence_requested: {
    label: "Evidence Requested",
    icon: FileSearch,
    description: "Additional evidence has been requested",
    estimatedDays: 3,
  },
  final_review: {
    label: "Final Review",
    icon: Eye,
    description: "Final review and decision",
    estimatedDays: 1,
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    description: "Verification approved",
    estimatedDays: 0,
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    description: "Verification rejected",
    estimatedDays: 0,
  },
};

const progressSteps: VerificationStep[] = [
  "submitted",
  "under_review",
  "evidence_requested",
  "final_review",
  "approved",
];

interface VerificationProgressProps {
  currentStep: VerificationStep;
  notes?: string;
  updatedAt?: string;
}

export function VerificationProgress({
  currentStep,
  notes,
  updatedAt,
}: VerificationProgressProps) {
  const isRejected = currentStep === "rejected";
  const currentIndex = isRejected
    ? 1 // Show as failed at review stage
    : progressSteps.indexOf(currentStep);

  const totalEstimatedDays = progressSteps
    .slice(currentIndex + 1)
    .reduce((sum, step) => sum + stepConfig[step].estimatedDays, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Verification Progress</h3>
        {updatedAt && (
          <span className="text-xs text-zinc-500">
            Updated {new Date(updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1">
        {progressSteps.map((step, index) => {
          const config = stepConfig[step];
          const Icon = config.icon;
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;
          const isFailed = isRejected && index === currentIndex;

          return (
            <React.Fragment key={step}>
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? isFailed
                      ? "bg-red-50 text-red-700 dark:bg-red-900/20"
                      : "bg-blue-50 text-blue-700 dark:bg-blue-900/20"
                    : isComplete
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
              </div>
              {index < progressSteps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-zinc-300" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current step details */}
      <div
        className={`rounded-lg border p-4 ${
          isRejected
            ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10"
            : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
        }`}
      >
        <div className="flex items-center gap-2">
          <Badge variant={isRejected ? "error" : isActive ? "info" : "success"}>
            {stepConfig[currentStep].label}
          </Badge>
          {!isRejected && totalEstimatedDays > 0 && (
            <span className="text-xs text-zinc-500">
              Est. {totalEstimatedDays} day{totalEstimatedDays !== 1 ? "s" : ""} remaining
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {stepConfig[currentStep].description}
        </p>
        {notes && (
          <div className="mt-3 rounded-md bg-zinc-100 p-3 dark:bg-zinc-800">
            <p className="text-xs font-medium text-zinc-500 mb-1">Notes</p>
            <p className="text-sm">{notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
