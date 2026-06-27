import React, { useState, useEffect } from "react";

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, className = "", id, maxLength, onChange, value, defaultValue, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const counterId = `${textareaId}-counter`;

    const [charCount, setCharCount] = useState(0);

    useEffect(() => {
      if (typeof value === "string") {
        setCharCount(value.length);
      } else if (typeof defaultValue === "string") {
        setCharCount(defaultValue.length);
      }
    }, [value, defaultValue]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    const isNearLimit = maxLength && charCount >= maxLength * 0.9;
    const isAtLimit = maxLength && charCount >= maxLength;

    const counterClass = isAtLimit
      ? "text-red-500"
      : isNearLimit
      ? "text-amber-500"
      : "text-zinc-500";

    const baseBorder = error || isAtLimit
      ? "border-red-500/50 focus:border-red-500"
      : isNearLimit
      ? "border-amber-500/50 focus:border-amber-500"
      : "border-zinc-200 dark:border-zinc-800 focus:border-blue-500/50";

    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between items-end">
          <label htmlFor={textareaId} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
          {maxLength && (
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
          ref={ref}
          id={textareaId}
          rows={4}
          maxLength={maxLength}
          onChange={handleChange}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={error || isAtLimit ? true : undefined}
          aria-describedby={[error ? errorId : "", maxLength ? counterId : ""].filter(Boolean).join(" ") || undefined}
          className={`w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border ${baseBorder} rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none ${className}`}
          {...props}
        />
        {error && (
          <span id={errorId} className="text-xs font-medium text-red-500 ml-1" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

TextAreaField.displayName = "TextAreaField";
