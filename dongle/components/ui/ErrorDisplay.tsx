"use client";

import { useRef } from "react";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import { MappedError } from "@/lib/error-mapper";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";

interface ErrorDisplayProps {
  error: MappedError;
  variant?: "inline" | "banner" | "modal";
  severity?: "error" | "warning" | "info";
  showTechnicalDetails?: boolean;
  onClose?: () => void;
}

export default function ErrorDisplay({
  error,
  variant = "inline",
  severity = "error",
  showTechnicalDetails = false,
  onClose,
}: ErrorDisplayProps) {
  const icons = {
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    error: {
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-900/50",
      text: "text-red-800 dark:text-red-300",
      icon: "text-red-500 dark:text-red-400",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/20",
      border: "border-amber-200 dark:border-amber-900/50",
      text: "text-amber-800 dark:text-amber-300",
      icon: "text-amber-500 dark:text-amber-400",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/20",
      border: "border-blue-200 dark:border-blue-900/50",
      text: "text-blue-800 dark:text-blue-300",
      icon: "text-blue-500 dark:text-blue-400",
    },
  };

  const Icon = icons[severity];
  const colorScheme = colors[severity];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useModalFocusTrap(variant === "modal", dialogRef, closeButtonRef, onClose);

  if (variant === "inline") {
    return (
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border ${colorScheme.bg} ${colorScheme.border}`}
      >
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${colorScheme.icon}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${colorScheme.text}`}>
            {error.userMessage}
          </p>
          {error.actionable && (
            <p className={`text-xs mt-1 ${colorScheme.text} opacity-80`}>
              {error.actionable}
            </p>
          )}
          {showTechnicalDetails && error.technicalDetails && (
            <details className="mt-2">
              <summary className={`text-xs cursor-pointer ${colorScheme.text} opacity-60 hover:opacity-100`}>
                Technical details
              </summary>
              <pre className={`text-xs mt-1 p-2 rounded bg-black/5 dark:bg-white/5 overflow-x-auto ${colorScheme.text} font-mono`}>
                {error.technicalDetails}
                {error.code && `\nCode: ${error.code}`}
              </pre>
            </details>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`shrink-0 ${colorScheme.text} opacity-50 hover:opacity-100 transition-opacity`}
            aria-label="Close"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`flex items-center gap-3 px-6 py-4 border-b ${colorScheme.bg} ${colorScheme.border}`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${colorScheme.icon}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${colorScheme.text}`}>
            {error.userMessage}
          </p>
          {error.actionable && (
            <p className={`text-xs mt-0.5 ${colorScheme.text} opacity-80`}>
              {error.actionable}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`shrink-0 ${colorScheme.text} opacity-50 hover:opacity-100 transition-opacity`}
            aria-label="Close"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-dialog-title"
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <div className={`flex items-center gap-3 px-6 py-4 border-b ${colorScheme.bg} ${colorScheme.border}`}>
            <Icon className={`w-6 h-6 shrink-0 ${colorScheme.icon}`} />
            <h3 id="error-dialog-title" className={`font-bold text-lg ${colorScheme.text}`}>
              {severity === "error" ? "Error" : severity === "warning" ? "Warning" : "Information"}
            </h3>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
              {error.userMessage}
            </p>
            {error.actionable && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                {error.actionable}
              </p>
            )}
            {showTechnicalDetails && error.technicalDetails && (
              <details className="mt-3">
                <summary className="text-xs cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                  Show technical details
                </summary>
                <pre className="text-xs mt-2 p-3 rounded bg-zinc-100 dark:bg-zinc-800 overflow-x-auto text-zinc-600 dark:text-zinc-400 font-mono">
                  {error.technicalDetails}
                  {error.code && `\nCode: ${error.code}`}
                </pre>
              </details>
            )}
          </div>
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end border-t border-zinc-200 dark:border-zinc-800">
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
