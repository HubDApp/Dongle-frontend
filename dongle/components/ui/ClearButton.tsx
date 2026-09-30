"use client";

import React from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";
import { cn } from "@/lib/utils";

export interface ClearButtonProps {
  /**
   * Callback fired when the clear button is clicked
   */
  onClear: () => void;
  /**
   * Whether the field has a value that can be cleared
   */
  hasValue: boolean;
  /**
   * The field ID or name for accessibility
   */
  fieldId: string;
  /**
   * Optional additional label for the clear button
   */
  fieldLabel?: string;
  /**
   * Size variant
   */
  size?: "sm" | "md";
  /**
   * Custom class names
   */
  className?: string;
  /**
   * Whether the button should be visible (defaults to showing on focus)
   */
  visible?: boolean;
}

/**
 * ClearButton component for form fields
 * 
 * Features:
 * - Appears when field has value
 * - Fully accessible with ARIA labels
 * - Smooth transitions
 * - Keyboard accessible
 * - Works with focus management
 * 
 * @example
 * ```tsx
 * <ClearButton
 *   onClear={() => setValue('')}
 *   hasValue={!!value}
 *   fieldId="email"
 *   fieldLabel="Email"
 * />
 * ```
 */
export const ClearButton = React.forwardRef<HTMLButtonElement, ClearButtonProps>(
  (
    {
      onClear,
      hasValue,
      fieldId,
      fieldLabel,
      size = "sm",
      className,
      visible = true,
    },
    ref
  ) => {
    if (!hasValue || !visible) {
      return null;
    }

    const ariaLabel = fieldLabel
      ? `Clear ${fieldLabel}`
      : `Clear field ${fieldId}`;

    return (
      <IconButton
        ref={ref}
        type="button"
        variant="ghost"
        size={size}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClear();
        }}
        className={cn(
          "transition-opacity focus-visible:opacity-100",
          "hover:bg-zinc-200 dark:hover:bg-zinc-700",
          className
        )}
        tabIndex={0}
      >
        <X className="w-4 h-4" />
      </IconButton>
    );
  }
);

ClearButton.displayName = "ClearButton";
