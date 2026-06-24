"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type ConfirmDialogVariant = "danger" | "warning" | "info";

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const config = VARIANT_CONFIG[variant];

  // Move focus into the dialog when it opens
  useEffect(() => {
    if (isOpen) {
      cancelBtnRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape; trap Tab focus inside the dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
      aria-hidden="true"
    >
      {/* Dialog panel — stop click propagation so backdrop click doesn't fire inside */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onClick={(e) => e.stopPropagation()}
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
          className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-8"
        >
          {description}
        </p>

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
