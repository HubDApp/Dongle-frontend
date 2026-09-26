"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";
import { stripNonDigits, inputFormatters, type MaskType } from "@/utils/mask.util";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaskedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
  /** Label displayed above the input. */
  label: string;
  /** The type of masking to apply. */
  maskType: MaskType;
  /**
   * The raw (digits-only) value.
   * `onChange` will receive a string containing only digits.
   */
  value?: string;
  /** Called with the cleaned digit-only value. */
  onChange?: (value: string) => void;
  /** Validation error message to display. */
  error?: string;
  /** Helper text shown below the field when there is no error. */
  helperText?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A form input that masks/f formats sensitive data during entry.
 *
 * - **phone** → displayed as `(XXX) XXX-XXXX`
 * - **credit-card** → displayed as `XXXX-XXXX-XXXX-XXXX` (masked on blur)
 * - **ssn** → displayed as `XXX-XX-XXXX` (masked on blur)
 *
 * The raw value passed via `value` / `onChange` will always be **digits only**,
 * so validation works on the clean number.
 *
 * Supports paste: pasted content has non-digits stripped automatically.
 */
export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  (
    {
      label,
      maskType,
      value = "",
      onChange,
      error,
      helperText,
      className = "",
      id,
      disabled,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const formatForDisplay = inputFormatters[maskType];

    // The display value is always the formatted version of the raw digits
    const displayValue = formatForDisplay(value);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        // Strip non-digits on every change (handles paste too)
        const cleaned = stripNonDigits(e.target.value);
        onChange?.(cleaned);
      },
      [onChange],
    );

    // Build a suitable placeholder that hints at the expected format
    const inputPlaceholder =
      placeholder ??
      (maskType === "phone"
        ? "(555) 555-5555"
        : maskType === "credit-card"
        ? "1234-5678-9012-3456"
        : "123-45-6789");

    return (
      <div className="flex flex-col gap-2 w-full">
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
        >
          {label}
        </label>
        <input
          {...props}
          ref={ref}
          id={inputId}
          type="text"
          inputMode={maskType === "phone" ? "tel" : "numeric"}
          autoComplete={
            maskType === "phone"
              ? "tel"
              : maskType === "credit-card"
              ? "cc-number"
              : "off"
          }
          value={displayValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder={inputPlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : "", helperText ? helperId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(
            "w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl transition-all outline-none",
            "focus:ring-2 focus:ring-blue-500/20",
            error
              ? "border-red-500/50 focus:border-red-500"
              : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
        />
        {error && (
          <span
            id={errorId}
            className="text-xs font-medium text-red-500 ml-1"
            role="alert"
          >
            {error}
          </span>
        )}
        {!error && helperText && (
          <span
            id={helperId}
            className="text-xs text-zinc-500 dark:text-zinc-400 ml-1"
          >
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

MaskedInput.displayName = "MaskedInput";