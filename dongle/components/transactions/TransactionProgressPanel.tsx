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

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 ${className}`}
    >
      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        {phase === "failure"
          ? "Transaction failed"
          : phase === "success"
            ? "Transaction complete"
            : "Transaction in progress"}
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">{message}</p>

      <ol className="space-y-3">
        {(TRANSACTION_PHASE_ORDER.slice(0, -1) as Array<
          keyof typeof TRANSACTION_PHASE_LABELS
        >).map((step, index) => {
          const completed =
            phase === "success" || (isActive && index < activeIndex);
          const active = isActive && index === activeIndex;
          const failed = phase === "failure" && index === activeIndex;
          const label = TRANSACTION_PHASE_LABELS[step];

          return (
            <li key={step} className="flex items-center gap-3 text-sm">
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
