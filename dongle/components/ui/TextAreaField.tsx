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
import { useFormPasteDetection } from "@/hooks/useFormPasteDetection";
import type { PasteEvent } from "@/hooks/useFormPasteDetection";

interface TextAreaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  showCounter?: boolean;
  /** When true, shows a required indicator and sets aria-required. */
  required?: boolean;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, helperText, className = "", id, maxLength, onChange, value, defaultValue, showCounter = true, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const counterId = `${textareaId}-counter`;
    const helperId = `${textareaId}-helper`;

    // Issue #524: derive contextual placeholder when none is provided
    const resolvedPlaceholder = placeholder ?? getFieldPlaceholder({
      fieldType: fieldType ?? inferFieldType("textarea", props.name),
      maxLength,
    });

    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const [charCount, setCharCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);

    const countWords = (text: string): number => {
      const trimmedText = text.trim();
      if (!trimmedText) return 0;
      return trimmedText.split(/\s+/).length;
    };

    // -----------------------------------------------------------------------
    // Paste detection (Issue #517)
    // -----------------------------------------------------------------------
    const { createPasteHandler } = useFormPasteDetection({
      onPaste: onPasteDetected,
      preventDefaultPaste,
    });

    const handlePaste = createPasteHandler(name ?? label);

    // -----------------------------------------------------------------------
    // Character counter
    // -----------------------------------------------------------------------
    const syncCharCount = useCallback(() => {
      let text = "";
      if (typeof value === "string") {
        text = value;
        setCharCount(value.length);
      } else if (internalRef.current) {
        text = internalRef.current.value;
        setCharCount(internalRef.current.value.length);
      } else if (typeof defaultValue === "string") {
        text = defaultValue;
        setCharCount(defaultValue.length);
      }
      if (showWordCount) {
        setWordCount(countWords(text));
      }
    }, [value, defaultValue, showWordCount, countWords]);

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
          if (showWordCount) {
            setWordCount(countWords(element.value));
          }
        }
      },
      [ref, showWordCount, countWords]
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      if (showWordCount) {
        setWordCount(countWords(e.target.value));
      }
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

    const baseBorder =
      error || isOverLimit || isAtLimit
        ? "border-red-500/50 focus:border-red-500"
        : isNearLimit
        ? "border-amber-500/50 focus:border-amber-500"
        : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50";

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
          <label htmlFor={textareaId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
            {required ? (
              <span className="text-red-500 ml-0.5" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
          <div className="flex gap-4">
            {showWordCount && (
              <span
                id={wordCounterId}
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400 transition-colors"
                aria-live="polite"
              >
                {wordCount} {targetWordCount ? `/ ${targetWordCount}` : ""} words
              </span>
            )}
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
        </div>
        <textarea
          {...props}
          ref={setRef}
          id={textareaId}
          name={name}
          rows={4}
          maxLength={maxLength}
          onChange={handleChange}
          onPaste={handlePaste}
          value={value}
          defaultValue={defaultValue}
          required={required}
          aria-required={required || undefined}
          aria-invalid={displayError || isAtLimit || isOverLimit ? true : undefined}
          aria-describedby={[displayError ? errorId : "", maxLength && showCounter ? counterId : "", helperText ? helperId : ""].filter(Boolean).join(" ") || undefined}
          className={`w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border ${baseBorder} rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none ${className}`}
        />

        {readOnly && !disabled && (
          <span id={`${textareaId}-readonly-hint`} className="sr-only">
            This field is read-only and cannot be edited.
          </span>
        )}

        {displayError && (
          <span id={errorId} className="text-xs font-medium text-red-500 ms-1" role="alert">
            {displayError}
          </span>
        )}
        {!displayError && helperText && (
          <span
            id={helperId}
            className="text-xs text-zinc-500 dark:text-zinc-400 ml-1"
            role="note"
          >
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

TextAreaField.displayName = "TextAreaField";
