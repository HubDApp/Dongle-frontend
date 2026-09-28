"use client";

import React, { useState, useCallback } from "react";
import { CheckCircle2, Circle, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export type StepStatus = "pending" | "in-progress" | "completed" | "failed";

export interface SubmissionStep {
  id: string;
  name: string;
  description?: string;
}

export interface FormSubmissionProgressProps {
  /**
   * The list of sequential steps in the submission process.
   */
  steps: SubmissionStep[];
  /**
   * The currently active step index (0-based).
   */
  currentStepIndex: number;
  /**
   * Overall submission status.
   * @default "in-progress"
   */
  status?: "idle" | "in-progress" | "success" | "error";
  /**
   * Explicit percentage complete (0-100). If omitted, calculated automatically.
   */
  percentComplete?: number;
  /**
   * Informative message explaining what is currently happening.
   */
  statusMessage?: string;
  /**
   * Error message if the submission failed.
   */
  errorMessage?: string;
  /**
   * Callback to retry on failure.
   */
  onRetry?: () => void;
  /**
   * Whether to display the numeric percentage complete.
   * @default true
   */
  showPercentage?: boolean;
  /**
   * Additional container CSS classes.
   */
  className?: string;
}

/**
 * Calculates default percentage based on step index and status.
 */
export function calculateProgressPercent(
  stepIndex: number,
  totalSteps: number,
  status: "idle" | "in-progress" | "success" | "error" = "in-progress"
): number {
  if (totalSteps <= 0 || status === "idle") return 0;
  if (status === "success") return 100;
  // If in progress, each completed step contributes full share, current step contributes partial share
  const baseStep = Math.max(0, Math.min(stepIndex, totalSteps - 1));
  const completedRatio = baseStep / totalSteps;
  const inProgressBonus = status === "in-progress" ? 0.5 / totalSteps : 0;
  const percent = Math.round((completedRatio + inProgressBonus) * 100);
  return Math.min(99, Math.max(5, percent));
}

/**
 * Renders the state icon for an individual step.
 */
function StepStatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" aria-label="Step completed" />;
    case "in-progress":
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" aria-label="Step in progress" />;
    case "failed":
      return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" aria-label="Step failed" />;
    case "pending":
    default:
      return <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700 shrink-0" aria-label="Step pending" />;
  }
}

/**
 * FormSubmissionProgress displays real-time visual progress for multi-step form submissions,
 * including a progress bar, step names, percentage complete, and active step highlight.
 */
export function FormSubmissionProgress({
  steps,
  currentStepIndex,
  status = "in-progress",
  percentComplete,
  statusMessage,
  errorMessage,
  onRetry,
  showPercentage = true,
  className = "",
}: FormSubmissionProgressProps) {
  if (status === "idle" || steps.length === 0) {
    return null;
  }

  const computedPercent =
    percentComplete !== undefined
      ? Math.max(0, Math.min(100, percentComplete))
      : calculateProgressPercent(currentStepIndex, steps.length, status);

  return (
    <div
      role="region"
      aria-label="Form submission progress"
      className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 shadow-sm space-y-4 ${className}`}
    >
      {/* Header with Title and Percentage */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {status === "success"
              ? "Submission Completed"
              : status === "error"
              ? "Submission Interrupted"
              : "Submitting Form..."}
          </h4>
          {statusMessage && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{statusMessage}</p>
          )}
        </div>

        {showPercentage && (
          <span
            data-testid="progress-percent"
            className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono"
          >
            {computedPercent}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div
        className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden"
        role="progressbar"
        aria-valuenow={computedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Form submission percentage"
      >
        <div
          data-testid="progress-bar-fill"
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            status === "success"
              ? "bg-green-500"
              : status === "error"
              ? "bg-red-500"
              : "bg-blue-600 dark:bg-blue-500"
          }`}
          style={{ width: `${computedPercent}%` }}
        />
      </div>

      {/* Step List */}
      <ol className="space-y-2 pt-1">
        {steps.map((step, index) => {
          let stepStatus: StepStatus = "pending";
          if (status === "success") {
            stepStatus = "completed";
          } else if (index < currentStepIndex) {
            stepStatus = "completed";
          } else if (index === currentStepIndex) {
            stepStatus = status === "error" ? "failed" : "in-progress";
          } else {
            stepStatus = "pending";
          }

          const isCurrent = index === currentStepIndex && status !== "success";

          return (
            <li
              key={step.id || index}
              data-testid={`submission-step-${index}`}
              className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors ${
                isCurrent
                  ? "bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 shadow-xs"
                  : "border border-transparent"
              }`}
            >
              <div className="mt-0.5">
                <StepStatusIcon status={stepStatus} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isCurrent
                        ? "text-blue-950 dark:text-blue-100 font-semibold"
                        : stepStatus === "completed"
                        ? "text-zinc-700 dark:text-zinc-300"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {step.name}
                  </span>
                  {isCurrent && status === "in-progress" && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      Active
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Error / Retry Action */}
      {status === "error" && errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 space-y-2">
          <p>{errorMessage}</p>
          {onRetry && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="mt-1 inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry from current step
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage multi-step async form submission progress.
 */
export function useFormSubmissionProgress(initialSteps: SubmissionStep[]) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "in-progress" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const reset = useCallback(() => {
    setCurrentStepIndex(0);
    setStatus("idle");
    setStatusMessage(undefined);
    setErrorMessage(undefined);
  }, []);

  /**
   * Executes an array of async functions corresponding to steps sequentially.
   */
  const executeAsyncSteps = useCallback(
    async (
      tasks: Array<(context: { stepIndex: number; setStatusMessage: (msg: string) => void }) => Promise<any>>
    ) => {
      setStatus("in-progress");
      setErrorMessage(undefined);

      for (let i = 0; i < tasks.length; i++) {
        setCurrentStepIndex(i);
        const task = tasks[i];
        const step = initialSteps[i];
        setStatusMessage(step?.description || `Running ${step?.name || `step ${i + 1}`}...`);

        try {
          await task({
            stepIndex: i,
            setStatusMessage: (msg) => setStatusMessage(msg),
          });
        } catch (err) {
          setStatus("error");
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMessage(msg);
          throw err;
        }
      }

      setStatus("success");
      setStatusMessage("All submission steps completed successfully.");
    },
    [initialSteps]
  );

  return {
    currentStepIndex,
    setCurrentStepIndex,
    status,
    setStatus,
    statusMessage,
    setStatusMessage,
    errorMessage,
    setErrorMessage,
    reset,
    executeAsyncSteps,
  };
}

export default FormSubmissionProgress;
