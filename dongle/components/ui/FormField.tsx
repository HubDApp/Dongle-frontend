/**
 * FormField — Issue #532 (read-only state)
 *
 * Read-only fields:
 *  - Show the value and submit it (unlike disabled which excludes value)
 *  - User cannot edit but can focus/select/copy the text
 *  - Visually distinct from both editable and disabled states
 *  - Validation runs normally (value is included in submission)
 *  - Keyboard accessible (receives focus, tab-navigable)
 *  - aria-readonly is set
 *
 * Also retains all disabled-state logic from Issue #531.
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
      readOnly,
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
      // Read-only native inputs still fire change events in some browsers.
      // We allow the handler to run only if the field is truly editable.
      if (!readOnly) {
        setCharCount(e.target.value.length);
        onChange?.(e);
      }
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

    // Disabled fields skip validation display; read-only fields validate normally.
    const displayError =
      !disabled &&
      (error || (isOverLimit ? `Cannot exceed ${maxLength} characters` : undefined));

    // Counter is hidden on disabled fields; visible on read-only (value is fixed).
    const showCounterDisplay = showCounter && maxLength && !disabled;

    const describedBy = [
      displayError ? errorId : "",
      showCounterDisplay ? counterId : "",
      helperText ? helperId : "",
      readOnly ? `${inputId}-readonly-hint` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-1.5">
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
            {/* Read-only badge — visible indicator that field is not editable */}
            {readOnly && !disabled && (
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                aria-hidden="true"
              >
                read-only
              </span>
            )}
          </div>
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
          readOnly={readOnly}
          error={!!displayError}
          onChange={handleChange}
          aria-disabled={disabled ? true : undefined}
          aria-readonly={readOnly ? true : undefined}
          aria-invalid={
            displayError || isAtLimit || isOverLimit ? true : undefined
          }
          aria-describedby={describedBy || undefined}
          className={cn(
            className,
            disabled &&
              "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500",
            readOnly &&
              !disabled &&
              "cursor-default bg-zinc-100/60 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 focus:ring-0 select-text",
          )}
        />

        {/* Hidden hint for screen readers describing the read-only state */}
        {readOnly && !disabled && (
          <span id={`${inputId}-readonly-hint`} className="sr-only">
            This field is read-only and cannot be edited.
          </span>
        )}

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
