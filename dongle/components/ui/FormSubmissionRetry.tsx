"use client";

import React, { useState } from "react";
import { AlertCircle, RefreshCw, X, ShieldAlert, WifiOff, AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface FormSubmissionRetryProps {
  /**
   * The error message or error object.
   */
  error?: Error | string | null;
  /**
   * Function to call when user clicks retry.
   */
  onRetry: () => Promise<void> | void;
  /**
   * Current number of retry attempts made (controlled).
   */
  retryCount?: number;
  /**
   * Maximum allowed retry attempts.
   * @default 3
   */
  maxRetries?: number;
  /**
   * Whether retry operation is currently executing.
   * @default false
   */
  isRetrying?: boolean;
  /**
   * Optional custom title.
   */
  title?: string;
  /**
   * Optional callback when user dismisses or cancels retry.
   */
  onDismiss?: () => void;
  /**
   * Additional container classes.
   */
  className?: string;
}

/**
 * Parses raw error into informative human-readable diagnosis and actionable advice.
 */
function getErrorDetails(error?: Error | string | null): {
  type: "rejection" | "network" | "validation" | "general";
  headline: string;
  description: string;
  icon: React.ReactNode;
} {
  const rawMsg = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = rawMsg.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user declined") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    return {
      type: "rejection",
      headline: "Wallet Signature Declined",
      description:
        "The transaction request was rejected or canceled in your wallet. Your form data has been preserved so you can retry whenever you are ready.",
      icon: <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />,
    };
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("timeout") ||
    lower.includes("rpc") ||
    lower.includes("offline") ||
    lower.includes("failed to fetch")
  ) {
    return {
      type: "network",
      headline: "Network Connection Issue",
      description:
        "Unable to reach the network node. Check your internet connection or network status. Your form data is saved.",
      icon: <WifiOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />,
    };
  }

  if (lower.includes("duplicate") || lower.includes("already exists") || lower.includes("invalid")) {
    return {
      type: "validation",
      headline: "Validation or Conflict Error",
      description:
        rawMsg || "One or more submission fields could not be verified. Your input remains intact below.",
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />,
    };
  }

  return {
    type: "general",
    headline: "Submission Failed",
    description:
      rawMsg || "An unexpected error occurred during submission. Your form data was preserved.",
    icon: <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />,
  };
}

/**
 * FormSubmissionRetry provides an accessible UI banner for retrying failed
 * form submissions. It preserves user form data, shows current retry counts,
 * enforces maximum retries, and gives informative error diagnoses.
 */
export function FormSubmissionRetry({
  error,
  onRetry,
  retryCount: controlledRetryCount,
  maxRetries = 3,
  isRetrying = false,
  title,
  onDismiss,
  className = "",
}: FormSubmissionRetryProps) {
  const [internalRetryCount, setInternalRetryCount] = useState(0);

  // Support controlled or uncontrolled retryCount
  const currentCount = controlledRetryCount !== undefined ? controlledRetryCount : internalRetryCount;
  const isMaxReached = currentCount >= maxRetries;
  const retriesRemaining = Math.max(0, maxRetries - currentCount);

  const errorDiagnosis = getErrorDetails(error);

  const handleRetry = async () => {
    if (isMaxReached || isRetrying) return;
    if (controlledRetryCount === undefined) {
      setInternalRetryCount((prev) => prev + 1);
    }
    await onRetry();
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-2xl border p-4 sm:p-5 transition-all ${
        isMaxReached
          ? "border-red-300 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20"
          : "border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {errorDiagnosis.icon}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {title || errorDiagnosis.headline}
              </h4>
              <span
                data-testid="retry-count-badge"
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isMaxReached
                    ? "bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300"
                    : "bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
                }`}
              >
                {isMaxReached
                  ? `Max retries reached (${currentCount}/${maxRetries})`
                  : `Retry ${currentCount}/${maxRetries} (${retriesRemaining} left)`}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {errorDiagnosis.description}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 italic">
              All entered form information has been preserved.
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error notice"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <Button
          type="button"
          size="sm"
          variant={isMaxReached ? "secondary" : "primary"}
          disabled={isMaxReached || isRetrying}
          isLoading={isRetrying}
          onClick={() => void handleRetry()}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          {isRetrying
            ? "Retrying submission..."
            : isMaxReached
            ? "Retry limit reached"
            : `Retry Submission (${retriesRemaining} left)`}
        </Button>

        {isMaxReached && (
          <span className="text-xs text-red-600 dark:text-red-400">
            Maximum retries enforced. Please verify your inputs or try again later.
          </span>
        )}
      </div>
    </div>
  );
}

export default FormSubmissionRetry;
