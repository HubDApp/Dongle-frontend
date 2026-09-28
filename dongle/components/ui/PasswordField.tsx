"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type PasswordAutoComplete = "current-password" | "new-password" | "off";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "autoComplete"> {
  /** Visible label above the field. */
  label: string;
  /** Validation error message. */
  error?: string;
  /** Helper text shown below the field when there is no error. */
  helperText?: string;
  /** autoComplete attribute for browser password manager support.
   *  - "current-password": sign-in form
   *  - "new-password": registration / change-password form
   *  - "off": disable auto-fill (use sparingly) */
  autoComplete?: PasswordAutoComplete;
  /** Show a character counter when maxLength is set (default: true). */
  showCounter?: boolean;
}

/**
 * A secure password input field with:
 * - type="password" and a show/hide toggle (Eye icon)
 * - Proper autoComplete attribute for browser password managers
 * - A lock icon to visually identify the field as a password input
 * - Character counter when maxLength is set
 * - Error and helper text support
 */
export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    {
      label,
      error,
      helperText,
      autoComplete = "off",
      showCounter = true,
      className = "",
      id,
      maxLength,
      onChange,
      value,
      defaultValue,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const counterId = `${inputId}-counter`;
    const [visible, setVisible] = useState(false);
    const [charCount, setCharCount] = useState(
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
          ? defaultValue.length
          : 0,
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    const isNearLimit = Boolean(maxLength && charCount >= maxLength * 0.9 && charCount < maxLength);
    const isAtLimit = Boolean(maxLength && charCount === maxLength);
    const isOverLimit = Boolean(maxLength && charCount > maxLength);

    const counterClass = isOverLimit || isAtLimit
      ? "text-red-500 font-semibold"
      : isNearLimit
        ? "text-amber-500 font-medium"
        : "text-zinc-500";

    const displayError = error || (isOverLimit ? `Cannot exceed ${maxLength} characters` : undefined);

    return (
      <div className="flex flex-col gap-2 w-full">
        {/* Label row */}
        <div className="flex justify-between items-end">
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-zinc-700 dark:text-zinc-300"
          >
            {label}
          </label>
          {showCounter && maxLength && (
            <span
              id={counterId}
              className={`text-xs font-medium ${counterClass} transition-colors`}
              aria-live="polite"
            >
              {charCount} / {maxLength}
            </span>
          )}
        </div>

        {/* Input wrapper */}
        <div className="relative">
          {/* Lock icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" aria-hidden="true">
            <Lock className="h-4 w-4" />
          </div>

          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            maxLength={maxLength}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            onChange={handleChange}
            aria-invalid={displayError ? true : undefined}
            aria-describedby={
              [displayError ? errorId : "", maxLength && showCounter ? counterId : "", helperText ? helperId : ""]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={cn(
              "w-full px-5 py-4 pl-11 pr-12 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl transition-all outline-none",
              "focus:ring-2 focus:ring-blue-500/20",
              error
                ? "border-red-500/50 focus:border-red-500"
                : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50",
              disabled && "opacity-50 cursor-not-allowed",
              className,
            )}
            {...props}
          />

          {/* Show/hide toggle */}
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-controls={inputId}
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
              "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Error message */}
        {displayError && (
          <span id={errorId} className="text-xs font-medium text-red-500 ml-1" role="alert">
            {displayError}
          </span>
        )}

        {/* Helper text (only when no error) */}
        {!displayError && helperText && (
          <span id={helperId} className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

PasswordField.displayName = "PasswordField";