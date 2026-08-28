import React, { useState, useEffect, useRef, useCallback } from "react";

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  showCounter?: boolean;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, className = "", id, maxLength, onChange, value, defaultValue, showCounter = true, ...props }, ref) => {
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
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;
        }
        if (element) {
          setCharCount(element.value.length);
        }
      },
      [ref]
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    const baseBorder = error || isOverLimit || isAtLimit
      ? "border-red-500/50 focus:border-red-500"
      : isNearLimit
      ? "border-amber-500/50 focus:border-amber-500"
      : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50";

    const displayError = error || (isOverLimit ? `Cannot exceed ${maxLength} characters` : undefined);

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between items-end">
          <label htmlFor={textareaId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
        <textarea
          {...props}
          ref={setRef}
          id={textareaId}
          rows={4}
          maxLength={maxLength}
          onChange={handleChange}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={displayError || isAtLimit || isOverLimit ? true : undefined}
          aria-describedby={[displayError ? errorId : "", maxLength && showCounter ? counterId : ""].filter(Boolean).join(" ") || undefined}
          className={`w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border ${baseBorder} rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none ${className}`}
        />
        {displayError && (
          <span id={errorId} className="text-xs font-medium text-red-500 ml-1" role="alert">
            {displayError}
          </span>
        )}
      </div>
    );
  }
);

TextAreaField.displayName = "TextAreaField";