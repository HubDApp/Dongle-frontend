/**
 * FormField — Issue #531 (disabled state handling)
 *
 * Changes from baseline:
 *  - Disabled fields suppress error display (validation is skipped)
 *  - Disabled fields suppress counter display
 *  - Disabled fields receive visual dimming + cursor-not-allowed via Tailwind
 *  - aria-disabled is set to complement the native disabled attribute
 *  - Label is dimmed when the field is disabled
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "./Input";
import { cn } from "@/lib/utils";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  showCounter?: boolean;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      helperText,
      className = "",
      id,
      maxLength,
      onChange,
      value,
      defaultValue,
      showCounter = true,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const counterId = `${inputId}-counter`;
    const helperId = `${inputId}-helper`;

    const internalRef = useRef<HTMLInputElement | null>(null);
    const [charCount, setCharCount] = useState(0);

    const syncCharCount = useCallback(() => {
      if (typeof value === "string") {
        setCharCount(value.length);
      } else if (internalRef.current) {
        setCharCount(internalRef.current.value.length);
      } else if (typeof defaultValue === "string") {
        setCharCount(defaultValue.length);
      }
    }, [value, defaultValue]);

    useEffect(() => {
      syncCharCount();
    }, [value, defaultValue, syncCharCount]);

    const setRef = useCallback(
      (element: HTMLInputElement | null) => {
        internalRef.current = element;
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current =
            element;
        }
        if (element) {
          setCharCount(element.value.length);
        }
      },
      [ref],
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    const isNearLimit = Boolean(
      maxLength && charCount >= maxLength * 0.9 && charCount < maxLength,
    );
    const isAtLimit = Boolean(maxLength && charCount === maxLength);
    const isOverLimit = Boolean(maxLength && charCount > maxLength);

    const counterClass =
      isOverLimit || isAtLimit
        ? "text-red-500 font-semibold"
        : isNearLimit
          ? "text-amber-500 font-medium"
          : "text-zinc-500";

    // Disabled fields skip validation display.
    const displayError =
      !disabled &&
      (error || (isOverLimit ? `Cannot exceed ${maxLength} characters` : undefined));

    // Counter is hidden on disabled fields (no point counting chars the user can't change).
    const showCounterDisplay = showCounter && maxLength && !disabled;

    const describedBy = [
      displayError ? errorId : "",
      showCounterDisplay ? counterId : "",
      helperText ? helperId : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between items-end">
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-semibold transition-colors",
              disabled
                ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                : "text-zinc-700 dark:text-zinc-300",
            )}
          >
            {label}
          </label>
          {showCounterDisplay && (
            <span
              id={counterId}
              className={`text-xs font-medium ${counterClass} transition-colors`}
              aria-live="polite"
            >
              {charCount} / {maxLength}
            </span>
          )}
        </div>
        <Input
          {...props}
          ref={setRef}
          id={inputId}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          error={!!displayError}
          onChange={handleChange}
          aria-disabled={disabled ? true : undefined}
          aria-invalid={
            displayError || isAtLimit || isOverLimit ? true : undefined
          }
          aria-describedby={describedBy || undefined}
          className={cn(
            className,
            disabled &&
              "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500",
          )}
        />
        {/* Errors are suppressed for disabled fields */}
        {displayError && (
          <span
            id={errorId}
            className="text-xs font-medium text-red-500 ml-1"
            role="alert"
          >
            {displayError}
          </span>
        )}
        {!displayError && helperText && (
          <span
            id={helperId}
            className={cn(
              "text-xs ml-1",
              disabled
                ? "text-zinc-400 dark:text-zinc-600"
                : "text-zinc-500 dark:text-zinc-400",
            )}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";
