/**
 * TextAreaField — Issue #532 (read-only state)
 *
 * Read-only fields:
 *  - Value is included in form submission
 *  - User cannot edit but can focus/select/copy the text
 *  - Visually distinct (muted background, "read-only" badge)
 *  - Validation runs normally
 *  - Keyboard accessible
 *  - aria-readonly is set
 *
 * Also retains all disabled-state logic from Issue #531.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TextAreaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  showCounter?: boolean;
}

export const TextAreaField = React.forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(
  (
    {
      label,
      error,
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
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const counterId = `${textareaId}-counter`;

    const internalRef = useRef<HTMLTextAreaElement | null>(null);
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
      (element: HTMLTextAreaElement | null) => {
        internalRef.current = element;
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
            element;
        }
        if (element) {
          setCharCount(element.value.length);
        }
      },
      [ref],
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    const displayError =
      !disabled &&
      (error || (isOverLimit ? `Cannot exceed ${maxLength} characters` : undefined));

    const showCounterDisplay = showCounter && maxLength && !disabled;

    const baseBorder =
      displayError || (!disabled && (isOverLimit || isAtLimit))
        ? "border-red-500/50 focus:border-red-500"
        : readOnly && !disabled
          ? "border-zinc-200 dark:border-zinc-700"
          : !disabled && isNearLimit
            ? "border-amber-500/50 focus:border-amber-500"
            : disabled
              ? "border-zinc-200 dark:border-zinc-800"
              : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50";

    const describedBy = [
      displayError ? errorId : "",
      showCounterDisplay ? counterId : "",
      readOnly ? `${textareaId}-readonly-hint` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={textareaId}
              className={cn(
                "text-sm font-semibold transition-colors",
                disabled
                  ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                  : "text-zinc-700 dark:text-zinc-300",
              )}
            >
              {label}
            </label>
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
        <textarea
          {...props}
          ref={setRef}
          id={textareaId}
          rows={4}
          maxLength={maxLength}
          onChange={handleChange}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          readOnly={readOnly}
          aria-disabled={disabled ? true : undefined}
          aria-readonly={readOnly ? true : undefined}
          aria-invalid={
            displayError || isAtLimit || isOverLimit ? true : undefined
          }
          aria-describedby={describedBy || undefined}
          className={cn(
            `w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border ${baseBorder} rounded-2xl`,
            "focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
            "text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none",
            disabled &&
              "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500",
            readOnly &&
              !disabled &&
              "cursor-default bg-zinc-100/60 dark:bg-zinc-800/30 text-zinc-700 dark:text-zinc-300 focus:ring-0 select-text",
            className,
          )}
        />

        {readOnly && !disabled && (
          <span id={`${textareaId}-readonly-hint`} className="sr-only">
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
      </div>
    );
  },
);

TextAreaField.displayName = "TextAreaField";
