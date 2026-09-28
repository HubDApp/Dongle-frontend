import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "./Input";
import { useFormPasteDetection } from "@/hooks/useFormPasteDetection";
import type { PasteEvent } from "@/hooks/useFormPasteDetection";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  showCounter?: boolean;
  /**
   * Called when the user pastes into this field.
   * The sanitized text and multi-value array are provided; the caller may
   * override the field value by calling e.g. react-hook-form's setValue.
   */
  onPasteDetected?: (event: PasteEvent) => void;
  /**
   * When true (default) the hook replaces the raw paste with the sanitized
   * value.  Set to false to let the browser handle the paste natively while
   * still getting the callback.
   */
  preventDefaultPaste?: boolean;
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
      onPasteDetected,
      preventDefaultPaste = true,
      name,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const counterId = `${inputId}-counter`;
    const helperId = `${inputId}-helper`;

    const internalRef = useRef<HTMLInputElement | null>(null);
    const [charCount, setCharCount] = useState(0);

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
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = element;
        }
        if (element) {
          setCharCount(element.value.length);
        }
      },
      [ref]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    const isNearLimit = Boolean(maxLength && charCount >= maxLength * 0.9 && charCount < maxLength);
    const isAtLimit = Boolean(maxLength && charCount === maxLength);
    const isOverLimit = Boolean(maxLength && charCount > maxLength);

    const counterClass =
      isOverLimit || isAtLimit
        ? "text-red-500 font-semibold"
        : isNearLimit
        ? "text-amber-500 font-medium"
        : "text-zinc-500";

    const displayError = error || (isOverLimit ? `Cannot exceed ${maxLength} characters` : undefined);

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between items-end">
          <label htmlFor={inputId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
        <Input
          {...props}
          ref={setRef}
          id={inputId}
          name={name}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          error={!!displayError}
          onChange={handleChange}
          onPaste={handlePaste}
          aria-invalid={displayError || isAtLimit || isOverLimit ? true : undefined}
          aria-describedby={
            [
              displayError ? errorId : "",
              maxLength && showCounter ? counterId : "",
              helperText ? helperId : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={className}
        />
        {displayError && (
          <span id={errorId} className="text-xs font-medium text-red-500 ml-1" role="alert">
            {displayError}
          </span>
        )}
        {!displayError && helperText && (
          <span id={helperId} className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
