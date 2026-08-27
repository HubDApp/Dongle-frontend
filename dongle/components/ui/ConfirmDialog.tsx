"use client";

import React, { useRef } from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useModalFocusTrap } from "@/hooks/useModalFocusTrap";

export type ConfirmDialogVariant = "danger" | "warning" | "info";

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  /** Hostname shown in the destination preview (external-link interstitial). */
  destinationDomain?: string;
  /** Full destination URL shown before leaving the app. */
  destinationUrl?: string;
}

interface ConfirmDialogProps extends ConfirmDialogOptions {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG: Record<
  ConfirmDialogVariant,
  { icon: React.ReactNode; iconBg: string; confirmVariant: "error" | "primary" | "secondary" }
> = {
  danger: {
    icon: <Trash2 className="w-6 h-6 text-red-500" aria-hidden="true" />,
    iconBg: "bg-red-100 dark:bg-red-900/30",
    confirmVariant: "error",
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-500" aria-hidden="true" />,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    confirmVariant: "primary",
  },
  info: {
    icon: <Info className="w-6 h-6 text-blue-500" aria-hidden="true" />,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    confirmVariant: "primary",
  },
};

/**
 * Accessible, app-styled confirmation dialog.
 *
 * Accessibility guarantees:
 * - role="alertdialog" with aria-modal, aria-labelledby, aria-describedby
 * - Focus moves to the dialog container on open; returns to the trigger on close
 * - Escape key cancels
 * - Clicks on the backdrop cancel
 * - Focus is trapped inside the dialog while open
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  destinationDomain,
  destinationUrl,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const config = VARIANT_CONFIG[variant];

  useModalFocusTrap(isOpen, dialogRef, cancelBtnRef, onCancel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop is decorative; dialog is a sibling so it stays accessible */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className={cn(
          "relative w-full max-w-md bg-white dark:bg-zinc-900",
          "border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl",
          "p-8 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200",
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mb-5",
            config.iconBg,
          )}
        >
          {config.icon}
        </div>

        {/* Text */}
        <h2
          id="confirm-dialog-title"
          className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-description"
          className={`text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed whitespace-pre-line ${
            destinationDomain || destinationUrl ? "mb-6" : "mb-8"
          }`}
        >
          {description}
        </p>

        {(destinationDomain || destinationUrl) && (
          <div className="mb-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
              Destination
            </p>
            {destinationDomain && (
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 break-all">
                {destinationDomain}
              </p>
            )}
            {destinationUrl && (
              <p className="mt-1 text-xs font-mono text-zinc-600 dark:text-zinc-300 break-all">
                {destinationUrl}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            ref={cancelBtnRef}
            variant="secondary"
            size="sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmVariant}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
