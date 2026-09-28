"use client";

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  TRANSACTION_PHASE_LABELS,
  TRANSACTION_PHASE_ORDER,
  type TransactionProgressState,
} from "@/lib/transaction-progress";

interface TransactionProgressPanelProps {
  progress: TransactionProgressState;
  onRetry?: () => void;
  className?: string;
}

function StepIcon({
  completed,
  active,
  failed,
}: {
  completed: boolean;
  active: boolean;
  failed: boolean;
}) {
  if (failed) {
    return <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />;
  }
  if (completed) {
    return <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />;
  }
  if (active) {
    return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" aria-hidden="true" />;
  }
  return <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700" aria-hidden="true" />;
}

export default function TransactionProgressPanel({
  progress,
  onRetry,
  className = "",
}: TransactionProgressPanelProps) {
  const { phase, message, errorMessage, retryable } = progress;
  const isActive = phase !== "idle" && phase !== "success" && phase !== "failure";
  const activeIndex = TRANSACTION_PHASE_ORDER.indexOf(
    phase === "failure" || phase === "idle" ? "preparing" : phase,
  );

  if (phase === "idle") {
    return null;
  }

  const stepsList = TRANSACTION_PHASE_ORDER.slice(0, -1) as Array<
    keyof typeof TRANSACTION_PHASE_LABELS
  >;
  const totalSteps = stepsList.length;
  const currentStep = phase === "success" ? totalSteps : Math.max(0, activeIndex);
  const percentComplete =
    phase === "success"
      ? 100
      : phase === "failure"
      ? Math.max(10, Math.round(((activeIndex + 0.5) / totalSteps) * 100))
      : Math.round(((currentStep + 0.5) / totalSteps) * 100);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
          {phase === "failure"
            ? "Transaction failed"
            : phase === "success"
              ? "Transaction complete"
              : "Transaction in progress"}
        </p>
        <span
          data-testid="transaction-progress-percent"
          className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
        >
          {percentComplete}%
        </span>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{message}</p>

      {/* Progress Bar */}
      <div
        className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 mb-4 overflow-hidden"
        role="progressbar"
        aria-valuenow={percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Transaction progress"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            phase === "success"
              ? "bg-green-500"
              : phase === "failure"
              ? "bg-red-500"
              : "bg-blue-600 dark:bg-blue-500"
          }`}
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      <ol className="space-y-2">
        {stepsList.map((step, index) => {
          const completed =
            phase === "success" || (isActive && index < activeIndex);
          const active = isActive && index === activeIndex;
          const failed = phase === "failure" && index === activeIndex;
          const label = TRANSACTION_PHASE_LABELS[step];

          return (
            <li
              key={step}
              className={`flex items-center justify-between gap-3 p-2 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 font-medium"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <StepIcon completed={completed} active={active} failed={failed} />
                <span
                  className={
                    completed
                      ? "text-zinc-700 dark:text-zinc-300"
                      : active
                        ? "font-medium text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-400 dark:text-zinc-500"
                  }
                >
                  {label}
                </span>
              </div>
              {active && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  Current
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {phase === "failure" && errorMessage && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      {phase === "failure" && retryable && onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 inline-flex items-center gap-2"
          onClick={onRetry}
        >
          <RefreshCw className="w-4 h-4" />
          Retry transaction
        </Button>
      )}
    </div>
  );
}
