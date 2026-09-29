"use client";

/**
 * FieldUndoRedoControls
 *
 * Small toolbar rendered beside a form field that exposes undo/redo buttons.
 * Intended to be composed with useFieldUndoRedo.
 *
 * Issue #518 – Add form field undo/redo functionality
 */

import React from "react";
import { Undo2, Redo2 } from "lucide-react";

export interface FieldUndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Optional additional class names for the wrapper. */
  className?: string;
  /** Label prefix used for aria labels, e.g. the field name. */
  fieldLabel?: string;
}

/**
 * Renders accessible Undo / Redo icon buttons.
 * Place next to a FormField or TextAreaField label.
 */
export function FieldUndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className = "",
  fieldLabel = "field",
}: FieldUndoRedoControlsProps) {
  return (
    <span
      role="group"
      aria-label={`Undo/redo controls for ${fieldLabel}`}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={`Undo last change to ${fieldLabel} (Ctrl+Z)`}
        title="Undo (Ctrl+Z)"
        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-zinc-500 dark:text-zinc-400
          hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label={`Redo last undone change to ${fieldLabel} (Ctrl+Y)`}
        title="Redo (Ctrl+Y)"
        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-zinc-500 dark:text-zinc-400
          hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Redo2 className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}
