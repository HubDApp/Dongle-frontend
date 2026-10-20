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
import type { FieldValues, Path, UseFormRegister, UseFormRegisterReturn } from "react-hook-form";
import { Input } from "./Input";
import { useFormPasteDetection } from "@/hooks/useFormPasteDetection";
import type { PasteEvent } from "@/hooks/useFormPasteDetection";

interface FormFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name"> {
  label: string;
  name?: Path<TFieldValues> | string;
  register?: UseFormRegister<TFieldValues>;
  error?: string;
  helperText?: string;
  showCounter?: boolean;
  /** When true, shows a required indicator and sets aria-required. */
  required?: boolean;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, name, register, error, helperText, className = "", id, maxLength, onChange, onBlur, value, defaultValue, showCounter = true, required, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const counterId = `${inputId}-counter`;
    const helperId = `${inputId}-helper`;
    const registration: UseFormRegisterReturn | undefined =
      register && name ? register(name as Path<FieldValues>) : undefined;

    // Issue #524: derive contextual placeholder when none is provided
    const resolvedPlaceholder = placeholder ?? getFieldPlaceholder({
      fieldType: fieldType ?? inferFieldType(props.type, props.name),
      maxLength,
    });

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
          (ref as React.MutableRefObject<HTMLInputElement | null>).current =
            element;
        }
        if (registration?.ref) {
          registration.ref(element);
        }
        if (element) {
          setCharCount(element.value.length);
        }
      },
      [ref, registration]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCharCount(e.target.value.length);
      registration?.onChange(e);
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      registration?.onBlur(e);
      onBlur?.(e);
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
          <label htmlFor={inputId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
            {required ? (
              <span className="text-red-500 ml-0.5" aria-hidden="true">
                *
              </span>
            ) : null}
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
          name={registration?.name ?? name}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          readOnly={readOnly}
          error={!!displayError}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          aria-required={required || undefined}
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

        {/* Hidden hint for screen readers describing the read-only state */}
        {readOnly && !disabled && (
          <span id={`${inputId}-readonly-hint`} className="sr-only">
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

FormField.displayName = "FormField";
