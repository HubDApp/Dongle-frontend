"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useModalFocusTrap } from "./useModalFocusTrap";

interface UseModalFormOptions<T extends Record<string, string>> {
  /** Whether the modal is currently open. */
  isOpen: boolean;
  /** Called when the user requests closing (Escape, backdrop click). */
  onClose: () => void;
  /** Initial field values when the modal opens. */
  initialValues: T;
}

interface UseModalFormReturn<T extends Record<string, string>> {
  /** Current form field values. */
  values: T;
  /** Setter for a single field. */
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Inline error string (cleared when a field changes). */
  error: string;
  /** Setter for the error string. */
  setError: (msg: string) => void;
  /** Ref attached to the dialog wrapper `<div>`. */
  dialogRef: React.RefObject<HTMLDivElement | null>;
  /** Ref attached to the first focusable element inside the dialog. */
  initialFocusRef: React.RefObject<HTMLSelectElement | null>;
  /** Reset all fields to `initialValues` and clear errors. */
  reset: () => void;
}

/**
 * Encapsulates the repeated modal-form pattern: field state, reset-on-open,
 * dialog refs, and focus trap.
 *
 * Used by `ReportProjectModal`, `ReportReviewModal`, `ClaimProjectModal`, and
 * `TransferOwnershipModal`.
 */
export function useModalForm<T extends Record<string, string>>({
  isOpen,
  onClose,
  initialValues,
}: UseModalFormOptions<T>): UseModalFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [error, setError] = useState("");

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<HTMLSelectElement | null>(null);

  const reset = useCallback(() => {
    setValues(initialValues);
    setError("");
  }, [initialValues]);

  // Reset state when opened
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(reset, 0);
    return () => clearTimeout(id);
  }, [isOpen, reset]);

  const setField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setError("");
    },
    [],
  );

  useModalFocusTrap(isOpen, dialogRef, initialFocusRef, onClose);

  return { values, setField, error, setError, dialogRef, initialFocusRef, reset };
}
